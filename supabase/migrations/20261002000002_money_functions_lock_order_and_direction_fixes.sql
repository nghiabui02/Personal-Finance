-- =============================================================================
-- Fixes on top of the atomic money functions (20261002000000 / ...0001).
--
-- Lock order is now the same everywhere: wallets (by id), then debts, then
-- debt_payments, then transactions. Previously a debt payment took the debt
-- first and an edit took the wallet first, so the two running together could
-- wait on each other until Postgres killed one of them. Each function reads
-- unlocked to discover what it touches, takes the locks in that order, then
-- re-reads and refuses if anything moved underneath it.
--
-- Three money bugs go with it:
--   - undoing a transfer whose wallet was deleted destroyed the amount
--   - editing a repayment could flip it from expense to income
--   - repaying a borrowed debt from a credit card charged nobody
-- =============================================================================

-- A debt repayment is tied to its debt by direction and category. Changing
-- either used to let a repayment turn into income: the wallet went up while the
-- debt still went down.
create or replace function public.update_transaction(
  p_id               uuid,
  p_type             text,
  p_amount           numeric,
  p_transaction_date date,
  p_category_id      uuid    default null,
  p_wallet_id        uuid    default null,
  p_note             text    default null,
  p_bank_fee         numeric default null
)
returns transactions
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid           uuid := require_user();
  v_fee           numeric;
  v_total         numeric;
  v_peek          transactions;
  v_old           transactions;
  v_wallet        wallets;
  v_payment       debt_payments;
  v_debt          debts;
  v_debt_id       uuid;
  v_new_remaining numeric;
  v_row           transactions;
begin
  if p_type not in ('income', 'expense') then
    raise exception 'A transaction is either income or expense.' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than 0.' using errcode = 'P0001';
  end if;
  if p_bank_fee is not null and p_bank_fee < 0 then
    raise exception 'A bank fee cannot be negative.' using errcode = 'P0001';
  end if;

  v_fee   := case when p_bank_fee > 0 then p_bank_fee else null end;
  v_total := p_amount + coalesce(v_fee, 0);

  -- Unlocked peek, only to find out which rows this edit will need.
  select * into v_peek from transactions where id = p_id and user_id = v_uid;
  if not found then
    raise exception 'Transaction not found.' using errcode = 'P0001';
  end if;
  if v_peek.transfer_pair_id is not null then
    raise exception 'This row is one half of a transfer. Delete the transfer and make a new one instead.'
      using errcode = 'P0001';
  end if;
  if v_peek.debt_payment_id is not null then
    select debt_id into v_debt_id from debt_payments where id = v_peek.debt_payment_id;
  end if;

  -- Locks, in the order every money function uses.
  perform 1 from wallets
    where user_id = v_uid and id in (v_peek.wallet_id, p_wallet_id)
    order by id
    for update;

  if v_debt_id is not null then
    select * into v_debt from debts where id = v_debt_id and user_id = v_uid for update;
    select * into v_payment from debt_payments where id = v_peek.debt_payment_id for update;
  end if;

  select * into v_old from transactions where id = p_id and user_id = v_uid for update;
  if not found then
    raise exception 'Transaction not found.' using errcode = 'P0001';
  end if;
  if v_old.wallet_id is distinct from v_peek.wallet_id
     or v_old.debt_payment_id is distinct from v_peek.debt_payment_id then
    raise exception 'This transaction changed while you were editing it. Reopen it and try again.'
      using errcode = 'P0001';
  end if;

  -- A repayment carries the direction and category that link it to the debt.
  if v_old.debt_payment_id is not null then
    if p_type is distinct from v_old.type then
      raise exception 'A debt repayment cannot switch between income and expense. Delete it and record the payment again.'
        using errcode = 'P0001';
    end if;
    if p_category_id is distinct from v_old.category_id then
      raise exception 'A debt repayment keeps its category — that is what ties it to the debt.'
        using errcode = 'P0001';
    end if;
    if v_fee is not null then
      raise exception 'A debt repayment cannot carry a bank fee.' using errcode = 'P0001';
    end if;
  end if;

  -- Give the old wallet its money back first, so the coverage check below sees
  -- what is really available once this edit has undone itself.
  if v_old.wallet_id is not null then
    update wallets
      set balance = balance + case when v_old.type = 'income' then -v_old.amount else v_old.amount end
      where id = v_old.wallet_id and user_id = v_uid;
  end if;

  if p_wallet_id is not null then
    select * into v_wallet from wallets where id = p_wallet_id and user_id = v_uid;
    if not found then
      raise exception 'Wallet not found.' using errcode = 'P0001';
    end if;
    if p_type = 'expense' and v_wallet.balance < v_total then
      raise exception '%', insufficient_balance_message(v_wallet) using errcode = 'P0001';
    end if;

    update wallets
      set balance = balance + case when p_type = 'income' then v_total else -v_total end
      where id = p_wallet_id and user_id = v_uid;
    perform assert_wallet_in_bounds(p_wallet_id);
  end if;

  if v_old.wallet_id is not null and v_old.wallet_id is distinct from p_wallet_id then
    perform assert_wallet_in_bounds(v_old.wallet_id);
  end if;

  if v_payment.id is not null and v_debt.id is not null then
    v_new_remaining := v_debt.remaining_amount + v_payment.amount - p_amount;

    if v_new_remaining < 0 then
      raise exception 'That is more than the % still outstanding on this debt.',
        format_dong(v_debt.remaining_amount + v_payment.amount) using errcode = 'P0001';
    end if;
    if v_new_remaining > v_debt.amount then
      raise exception 'Lowering this payment that far would leave more owed than the debt itself.'
        using errcode = 'P0001';
    end if;

    update debt_payments set amount = p_amount where id = v_payment.id;
    update debts
      set remaining_amount = v_new_remaining,
          status = case when v_new_remaining = 0 then 'completed' else 'active' end
      where id = v_debt.id and user_id = v_uid;
  end if;

  update transactions
    set type             = p_type,
        amount           = v_total,
        bank_fee         = v_fee,
        category_id      = p_category_id,
        wallet_id        = p_wallet_id,
        transaction_date = p_transaction_date,
        note             = nullif(btrim(coalesce(p_note, '')), '')
    where id = p_id and user_id = v_uid
    returning * into v_row;

  return v_row;
end;
$$;

-- Undoing a transfer whose wallet has since been deleted would hand the money
-- back to nobody: the orphaned leg carries no wallet to credit, while the other
-- side still gets debited. Refuse instead of destroying the amount.
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
      if v_leg.wallet_id is null then
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

-- Paying someone back is an expense whatever it is paid from. The old
-- credit-card branch booked it as income, so the debt fell, the card's used
-- credit fell too, and no wallet was ever charged.
create or replace function public.record_debt_payment(
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
  v_uid           uuid := require_user();
  v_peek          debts;
  v_debt          debts;
  v_wallet        wallets;
  v_wallet_id     uuid;
  v_tx_type       text;
  v_new_remaining numeric;
  v_payment_id    uuid;
  v_note          text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than 0.' using errcode = 'P0001';
  end if;

  -- Unlocked peek so the wallet can be locked before the debt, matching the
  -- order every other money function uses.
  select * into v_peek from debts where id = p_debt_id and user_id = v_uid;
  if not found then
    raise exception 'Debt not found.' using errcode = 'P0001';
  end if;

  v_wallet_id := coalesce(p_wallet_id, v_peek.wallet_id);

  if v_wallet_id is not null then
    select * into v_wallet from wallets
      where id = v_wallet_id and user_id = v_uid
      for update;
    if not found then
      raise exception 'Wallet not found.' using errcode = 'P0001';
    end if;
  end if;

  select * into v_debt from debts where id = p_debt_id and user_id = v_uid for update;
  if v_debt.remaining_amount <= 0 then
    raise exception 'This debt is already fully paid.' using errcode = 'P0001';
  end if;
  if p_amount > v_debt.remaining_amount then
    raise exception 'That is more than the % still outstanding.',
      format_dong(v_debt.remaining_amount) using errcode = 'P0001';
  end if;

  -- Direction follows the debt, not the wallet: collecting what you lent is
  -- income, paying back what you borrowed is an expense. Paying from a credit
  -- card uses up credit like any other spend.
  v_tx_type := case when v_debt.type = 'lend' then 'income' else 'expense' end;

  if v_wallet_id is not null and v_tx_type = 'expense' and v_wallet.balance < p_amount then
    raise exception '%', insufficient_balance_message(v_wallet) using errcode = 'P0001';
  end if;

  v_new_remaining := v_debt.remaining_amount - p_amount;
  v_note := coalesce(
    nullif(btrim(coalesce(p_note, '')), ''),
    case when v_debt.type = 'lend'
      then 'Repayment from ' || v_debt.person_name
      else 'Repayment to '   || v_debt.person_name
    end
  );

  insert into debt_payments (debt_id, amount, note)
  values (p_debt_id, p_amount, nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_payment_id;

  update debts
    set remaining_amount = v_new_remaining,
        status = case when v_new_remaining = 0 then 'completed' else status end
    where id = p_debt_id and user_id = v_uid;

  if v_wallet_id is not null then
    insert into transactions (
      user_id, wallet_id, category_id, type, amount, note, transaction_date, debt_payment_id
    ) values (
      v_uid, v_wallet_id, p_category_id, v_tx_type, p_amount, v_note, p_date, v_payment_id
    );

    update wallets
      set balance = balance + case when v_tx_type = 'income' then p_amount else -p_amount end
      where id = v_wallet_id and user_id = v_uid;
    perform assert_wallet_in_bounds(v_wallet_id);
  end if;

  return json_build_object(
    'remaining_amount', v_new_remaining,
    'settled', v_new_remaining = 0
  );
end;
$$;

-- The ledger runs on Vietnam time, not whatever the database server is set to.
-- The caller passes the date; the fallback keeps the function usable on its own.
create or replace function public.delete_wallet(p_wallet_id uuid, p_date date default null)
returns void
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid     uuid := require_user();
  v_wallet  wallets;
  v_default wallets;
  v_owed    numeric;
  v_pair_id uuid := gen_random_uuid();
  v_date    date := coalesce(p_date, (now() at time zone 'Asia/Ho_Chi_Minh')::date);
begin
  select * into v_wallet from wallets
    where id = p_wallet_id and user_id = v_uid
    for update;
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

  if v_wallet.type <> 'credit' and v_wallet.balance > 0 then
    select * into v_default from wallets
      where user_id = v_uid and is_default = true and id <> p_wallet_id
      for update;
    if not found then
      raise exception 'This wallet still holds %. Set another wallet as your default first, so the money has somewhere to go.',
        format_dong(v_wallet.balance) using errcode = 'P0001';
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

-- The single-argument version is gone: the date is no longer optional in
-- practice, and leaving both would let a caller pick the server's timezone.
drop function if exists public.delete_wallet(uuid);
