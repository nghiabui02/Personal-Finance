-- =============================================================================
-- Finishes the lock ordering started in 20261002000002.
--
-- Three functions were still taking locks in their own order: add_to_debt held
-- the debt before the wallet, delete_wallet took the wallet being removed
-- before the default one, and delete_transaction locked without re-checking
-- that the row still pointed at the wallet it was locked for. Each of those is
-- a cycle waiting for a second caller.
--
-- The order is: wallets (by id), then debts, then debt_payments, then
-- transactions. Read unlocked to learn what is needed, lock in that order,
-- re-read, and refuse if anything moved in between.
-- =============================================================================

create or replace function public.add_to_debt(
  p_debt_id     uuid,
  p_amount      numeric,
  p_date        date,
  p_wallet_id   uuid default null,
  p_category_id uuid default null,
  p_note        text default null
)
returns json
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid       uuid := require_user();
  v_peek      debts;
  v_debt      debts;
  v_wallet    wallets;
  v_tx_type   text;
  v_new_total numeric;
  v_new_rem   numeric;
  v_note      text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than 0.' using errcode = 'P0001';
  end if;

  -- Unlocked peek so the wallet is locked before the debt, the same way
  -- record_debt_payment does it.
  select * into v_peek from debts where id = p_debt_id and user_id = v_uid;
  if not found then
    raise exception 'Debt not found.' using errcode = 'P0001';
  end if;

  if p_wallet_id is not null then
    select * into v_wallet from wallets
      where id = p_wallet_id and user_id = v_uid
      for update;
    if not found then
      raise exception 'Wallet not found.' using errcode = 'P0001';
    end if;
  end if;

  select * into v_debt from debts where id = p_debt_id and user_id = v_uid for update;
  if v_debt.type is distinct from v_peek.type then
    raise exception 'This debt changed while you were adding to it. Reopen it and try again.'
      using errcode = 'P0001';
  end if;

  v_tx_type := case when v_debt.type = 'lend' then 'expense' else 'income' end;

  if p_wallet_id is not null and v_tx_type = 'expense' and v_wallet.balance < p_amount then
    raise exception '%', insufficient_balance_message(v_wallet) using errcode = 'P0001';
  end if;

  v_new_total := v_debt.amount + p_amount;
  v_new_rem   := v_debt.remaining_amount + p_amount;
  v_note := coalesce(
    nullif(btrim(coalesce(p_note, '')), ''),
    case when v_debt.type = 'lend'
      then 'Additional lend to ' || v_debt.person_name
      else 'Additional borrow from ' || v_debt.person_name
    end
  );

  insert into debt_payments (debt_id, amount, note, paid_at, type)
  values (p_debt_id, p_amount, nullif(btrim(coalesce(p_note, '')), ''), p_date::timestamptz, 'addition');

  update debts
    set amount = v_new_total, remaining_amount = v_new_rem, status = 'active'
    where id = p_debt_id and user_id = v_uid;

  if p_wallet_id is not null then
    insert into transactions (
      user_id, type, amount, wallet_id, transaction_date, note, category_id
    ) values (
      v_uid, v_tx_type, p_amount, p_wallet_id, p_date, v_note, p_category_id
    );

    update wallets
      set balance = balance + case when v_tx_type = 'income' then p_amount else -p_amount end
      where id = p_wallet_id and user_id = v_uid;
    perform assert_wallet_in_bounds(p_wallet_id);
  end if;

  return json_build_object('amount', v_new_total, 'remaining_amount', v_new_rem);
end;
$$;

create or replace function public.delete_wallet(p_wallet_id uuid, p_date date default null)
returns void
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid        uuid := require_user();
  v_peek       wallets;
  v_wallet     wallets;
  v_default    wallets;
  v_default_id uuid;
  v_owed       numeric;
  v_pair_id    uuid := gen_random_uuid();
  v_date       date := coalesce(p_date, (now() at time zone 'Asia/Ho_Chi_Minh')::date);
begin
  -- Unlocked peek: the default wallet has to be known before either lock is
  -- taken, so both can be locked together in id order. Taking the wallet being
  -- deleted first would deadlock against a transfer that happened to start from
  -- the other one.
  select * into v_peek from wallets where id = p_wallet_id and user_id = v_uid;
  if not found then
    raise exception 'Wallet not found.' using errcode = 'P0001';
  end if;

  select id into v_default_id from wallets
    where user_id = v_uid and is_default = true and id <> p_wallet_id;

  perform 1 from wallets
    where user_id = v_uid and id in (p_wallet_id, v_default_id)
    order by id
    for update;

  select * into v_wallet from wallets where id = p_wallet_id and user_id = v_uid;
  if not found then
    raise exception 'Wallet not found.' using errcode = 'P0001';
  end if;

  if v_wallet.type = 'credit' then
    v_owed := coalesce(v_wallet.credit_limit, 0) - v_wallet.balance;
    if v_owed > 0 then
      raise exception 'This card still owes %. Pay it off before deleting.', format_dong(v_owed)
        using errcode = 'P0001';
    end if;
  end if;

  -- On a credit card `balance` is available credit, not cash, and must never be
  -- handed to another wallet.
  if v_wallet.type <> 'credit' and v_wallet.balance > 0 then
    if v_default_id is null then
      raise exception 'This wallet still holds %. Set another wallet as your default first, so the money has somewhere to go.',
        format_dong(v_wallet.balance) using errcode = 'P0001';
    end if;

    select * into v_default from wallets where id = v_default_id and user_id = v_uid;
    if not found or not v_default.is_default then
      raise exception 'Your default wallet changed while this was running. Try again.'
        using errcode = 'P0001';
    end if;

    insert into transactions (user_id, wallet_id, type, amount, note, transaction_date, transfer_pair_id)
    values
      (v_uid, p_wallet_id, 'expense', v_wallet.balance,
       'Balance transferred to default wallet', v_date, v_pair_id),
      (v_uid, v_default.id, 'income', v_wallet.balance,
       'Balance transferred from deleted wallet', v_date, v_pair_id);

    update wallets set balance = balance + v_wallet.balance
      where id = v_default.id and user_id = v_uid;
    perform assert_wallet_in_bounds(v_default.id);
  end if;

  delete from wallets where id = p_wallet_id and user_id = v_uid;
end;
$$;

create or replace function public.delete_transaction(p_id uuid)
returns void
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid      uuid := require_user();
  v_peek     transactions;
  v_tx       transactions;
  v_leg      transactions;
  v_payment  debt_payments;
  v_debt     debts;
  v_debt_id  uuid;
  v_restored numeric;
  v_wallets  uuid[];
  v_wallet   uuid;
begin
  select * into v_peek from transactions where id = p_id and user_id = v_uid;
  if not found then
    raise exception 'Transaction not found.' using errcode = 'P0001';
  end if;

  if v_peek.transfer_pair_id is not null then
    if exists (
      select 1 from transactions
        where transfer_pair_id = v_peek.transfer_pair_id
          and user_id = v_uid
          and wallet_id is null
    ) then
      raise exception 'One of the wallets in this transfer no longer exists, so it cannot be undone. Record a correction instead.'
        using errcode = 'P0001';
    end if;

    select array_agg(distinct wallet_id order by wallet_id) into v_wallets
      from transactions
      where transfer_pair_id = v_peek.transfer_pair_id and user_id = v_uid;

    perform 1 from wallets
      where user_id = v_uid and id = any(coalesce(v_wallets, '{}'))
      order by id
      for update;

    -- Both legs locked in id order, so two deletes racing on the same pair
    -- queue up instead of waiting on each other.
    for v_leg in
      select * from transactions
        where transfer_pair_id = v_peek.transfer_pair_id and user_id = v_uid
        order by id
        for update
    loop
      -- Re-checked under the lock: a wallet can be deleted between the peek
      -- above and here, and the leg would then have nothing to credit.
      if v_leg.wallet_id is null or not (v_leg.wallet_id = any(v_wallets)) then
        raise exception 'One of the wallets in this transfer no longer exists, so it cannot be undone. Record a correction instead.'
          using errcode = 'P0001';
      end if;
      update wallets
        set balance = balance + case when v_leg.type = 'income' then -v_leg.amount else v_leg.amount end
        where id = v_leg.wallet_id and user_id = v_uid;
    end loop;

    delete from transactions
      where transfer_pair_id = v_peek.transfer_pair_id and user_id = v_uid;

    -- Spending the transferred money already may leave the destination short.
    -- Refusing here is the honest answer; undoing it halfway is not.
    foreach v_wallet in array coalesce(v_wallets, '{}') loop
      perform assert_wallet_in_bounds(v_wallet);
    end loop;

    return;
  end if;

  if v_peek.debt_payment_id is not null then
    select debt_id into v_debt_id from debt_payments where id = v_peek.debt_payment_id;
  end if;

  if v_peek.wallet_id is not null then
    perform 1 from wallets where id = v_peek.wallet_id and user_id = v_uid for update;
  end if;
  if v_debt_id is not null then
    select * into v_debt from debts where id = v_debt_id and user_id = v_uid for update;
    select * into v_payment from debt_payments where id = v_peek.debt_payment_id for update;
  end if;

  select * into v_tx from transactions where id = p_id and user_id = v_uid for update;
  if not found then
    raise exception 'Transaction not found.' using errcode = 'P0001';
  end if;

  -- The locks above were taken for the rows the peek saw. If the transaction
  -- was re-pointed in between, the wallet about to be moved is not the one
  -- under lock, and the ordering guarantee is gone with it.
  if v_tx.wallet_id is distinct from v_peek.wallet_id
     or v_tx.debt_payment_id is distinct from v_peek.debt_payment_id
     or v_tx.transfer_pair_id is distinct from v_peek.transfer_pair_id then
    raise exception 'This transaction changed while it was being deleted. Reopen it and try again.'
      using errcode = 'P0001';
  end if;

  if v_tx.wallet_id is not null then
    update wallets
      set balance = balance + case when v_tx.type = 'income' then -v_tx.amount else v_tx.amount end
      where id = v_tx.wallet_id and user_id = v_uid;
    perform assert_wallet_in_bounds(v_tx.wallet_id);
  end if;

  if v_payment.id is not null then
    if v_debt.id is not null then
      -- Capped at the original debt: a payment can only give back what it took off.
      v_restored := least(v_debt.remaining_amount + v_payment.amount, v_debt.amount);
      update debts
        set remaining_amount = v_restored,
            status = case when v_debt.status = 'completed' then 'active' else v_debt.status end
        where id = v_debt.id and user_id = v_uid;
    end if;
    delete from debt_payments where id = v_payment.id;
  end if;

  delete from transactions where id = p_id and user_id = v_uid;
end;
$$;
