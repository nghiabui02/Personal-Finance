-- =============================================================================
-- Atomic money movements
--
-- Every path that moves money used to be several PostgREST calls: insert a row,
-- then adjust a balance, then maybe touch a debt. Two problems came with that.
--
--   1. A failure halfway through left the ledger inconsistent — a payment
--      recorded against a debt that was never paid, a balance moved with no
--      transaction behind it.
--   2. The balance check and the balance write were separate round trips, so
--      two transfers issued at the same time could both read "enough money"
--      and both go through, overdrawing the wallet.
--
-- Each function below does the whole movement in one database transaction and
-- takes SELECT ... FOR UPDATE on every wallet it touches, so a second caller
-- waits and then reads the balance the first one left behind. Any RAISE rolls
-- the entire movement back.
--
-- Wallets are always locked in id order. Two transfers in opposite directions
-- between the same pair would otherwise each hold the lock the other wants.
--
-- SECURITY INVOKER (the default) is deliberate: row-level security still
-- applies, and the acting user comes from auth.uid() rather than an argument,
-- so a caller cannot name someone else's wallet.
--
-- Errors meant for the user are raised with SQLSTATE P0001; the API layer turns
-- those into 400 responses and shows the message as written here.
-- =============================================================================

-- Formats a dong amount the way the rest of the app does: 1.234.567đ
create or replace function public.format_dong(p_amount numeric)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select replace(to_char(trunc(p_amount), 'FM999,999,999,999'), ',', '.') || 'đ';
$$;

-- For a credit card `balance` is the credit still available, so the same
-- comparison answers both "is there money in it" and "is there room on it".
create or replace function public.insufficient_balance_message(p_wallet wallets)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select case
    when p_wallet.type = 'credit'
      then p_wallet.name || ' has only ' || format_dong(p_wallet.balance) || ' of credit left.'
    else p_wallet.name || ' only has ' || format_dong(p_wallet.balance) || '.'
  end;
$$;

-- Called after a balance write. Turns the table's CHECK constraints into
-- sentences, which a constraint violation would otherwise surface as a 500.
create or replace function public.assert_wallet_in_bounds(p_wallet_id uuid)
returns void
language plpgsql
set search_path to 'public'
as $$
declare
  v_wallet wallets;
begin
  select * into v_wallet from wallets where id = p_wallet_id;
  if not found then
    return;
  end if;

  if v_wallet.balance < 0 then
    raise exception '% does not have enough money for this.', v_wallet.name using errcode = 'P0001';
  end if;

  if v_wallet.type = 'credit' and v_wallet.balance > v_wallet.credit_limit then
    raise exception 'That is more than % currently owes.', v_wallet.name using errcode = 'P0001';
  end if;
end;
$$;

-- Every money function starts here: no session, no movement.
create or replace function public.require_user()
returns uuid
language plpgsql
stable
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in.' using errcode = 'P0001';
  end if;
  return v_uid;
end;
$$;

-- =============================================================================
-- 1. Create a transaction
-- =============================================================================
create or replace function public.create_transaction(
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
  v_uid    uuid := require_user();
  v_fee    numeric;
  v_total  numeric;
  v_wallet wallets;
  v_row    transactions;
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

  -- The caller sends the base amount; what gets stored, and what leaves the
  -- wallet, is base + fee. bank_fee is kept only so the breakdown can be shown.
  v_fee   := case when p_bank_fee > 0 then p_bank_fee else null end;
  v_total := p_amount + coalesce(v_fee, 0);

  if p_wallet_id is not null then
    select * into v_wallet from wallets
      where id = p_wallet_id and user_id = v_uid
      for update;
    if not found then
      raise exception 'Wallet not found.' using errcode = 'P0001';
    end if;
    if p_type = 'expense' and v_wallet.balance < v_total then
      raise exception '%', insufficient_balance_message(v_wallet) using errcode = 'P0001';
    end if;
  end if;

  insert into transactions (
    user_id, type, amount, bank_fee, category_id, wallet_id, transaction_date, note
  ) values (
    v_uid, p_type, v_total, v_fee, p_category_id, p_wallet_id,
    p_transaction_date, nullif(btrim(coalesce(p_note, '')), '')
  )
  returning * into v_row;

  if p_wallet_id is not null then
    update wallets
      set balance = balance + case when p_type = 'income' then v_total else -v_total end
      where id = p_wallet_id and user_id = v_uid;
    perform assert_wallet_in_bounds(p_wallet_id);
  end if;

  return v_row;
end;
$$;

-- =============================================================================
-- 2. Update a transaction
--
-- Also keeps a linked debt in step. Editing a repayment from 1.000.000 to
-- 2.000.000 used to move the wallet and leave debt_payments and the remaining
-- balance untouched, so the debt and the ledger disagreed from then on.
-- =============================================================================
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
  v_old           transactions;
  v_wallet        wallets;
  v_payment       debt_payments;
  v_debt          debts;
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

  select * into v_old from transactions
    where id = p_id and user_id = v_uid
    for update;
  if not found then
    raise exception 'Transaction not found.' using errcode = 'P0001';
  end if;

  if v_old.transfer_pair_id is not null then
    raise exception 'This row is one half of a transfer. Delete the transfer and make a new one instead.'
      using errcode = 'P0001';
  end if;

  -- Both wallets, in id order, before either balance is touched.
  perform 1 from wallets
    where user_id = v_uid
      and id in (v_old.wallet_id, p_wallet_id)
    order by id
    for update;

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

  -- A debt repayment carries no fee: the debt moves by the base amount.
  if v_old.debt_payment_id is not null then
    select * into v_payment from debt_payments
      where id = v_old.debt_payment_id
      for update;

    if found then
      select * into v_debt from debts
        where id = v_payment.debt_id and user_id = v_uid
        for update;

      if found then
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
    end if;
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

-- =============================================================================
-- 3. Delete a transaction
--
-- A transfer is two rows sharing transfer_pair_id. Deleting one of them used to
-- leave the other behind: the money was returned to one wallet and silently
-- kept by the other, and no screen showed the ledger was now short. Both legs
-- go together, and both wallets are put back where they were.
-- =============================================================================
create or replace function public.delete_transaction(p_id uuid)
returns void
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid      uuid := require_user();
  v_tx       transactions;
  v_leg      transactions;
  v_payment  debt_payments;
  v_debt     debts;
  v_restored numeric;
  v_wallets  uuid[];
  v_wallet   uuid;
begin
  select * into v_tx from transactions
    where id = p_id and user_id = v_uid
    for update;
  if not found then
    raise exception 'Transaction not found.' using errcode = 'P0001';
  end if;

  if v_tx.transfer_pair_id is not null then
    select array_agg(distinct wallet_id order by wallet_id) into v_wallets
      from transactions
      where transfer_pair_id = v_tx.transfer_pair_id
        and user_id = v_uid
        and wallet_id is not null;

    perform 1 from wallets
      where user_id = v_uid and id = any(coalesce(v_wallets, '{}'))
      order by id
      for update;

    for v_leg in
      select * from transactions
        where transfer_pair_id = v_tx.transfer_pair_id and user_id = v_uid
        for update
    loop
      if v_leg.wallet_id is not null then
        update wallets
          set balance = balance + case when v_leg.type = 'income' then -v_leg.amount else v_leg.amount end
          where id = v_leg.wallet_id and user_id = v_uid;
      end if;
    end loop;

    delete from transactions
      where transfer_pair_id = v_tx.transfer_pair_id and user_id = v_uid;

    -- Spending the transferred money already may leave the destination short.
    -- Refusing here is the honest answer; undoing it halfway is not.
    foreach v_wallet in array coalesce(v_wallets, '{}') loop
      perform assert_wallet_in_bounds(v_wallet);
    end loop;

    return;
  end if;

  if v_tx.wallet_id is not null then
    perform 1 from wallets where id = v_tx.wallet_id and user_id = v_uid for update;
    update wallets
      set balance = balance + case when v_tx.type = 'income' then -v_tx.amount else v_tx.amount end
      where id = v_tx.wallet_id and user_id = v_uid;
    perform assert_wallet_in_bounds(v_tx.wallet_id);
  end if;

  if v_tx.debt_payment_id is not null then
    select * into v_payment from debt_payments
      where id = v_tx.debt_payment_id
      for update;

    if found then
      select * into v_debt from debts
        where id = v_payment.debt_id and user_id = v_uid
        for update;

      if found then
        -- Capped at the original debt: a payment can only give back what it took off.
        v_restored := least(v_debt.remaining_amount + v_payment.amount, v_debt.amount);
        update debts
          set remaining_amount = v_restored,
              status = case when v_debt.status = 'completed' then 'active' else v_debt.status end
          where id = v_debt.id and user_id = v_uid;
      end if;

      delete from debt_payments where id = v_payment.id;
    end if;
  end if;

  delete from transactions where id = p_id and user_id = v_uid;
end;
$$;

-- =============================================================================
-- 4. Transfer between two wallets
-- =============================================================================
create or replace function public.transfer_funds(
  p_from_wallet_id uuid,
  p_to_wallet_id   uuid,
  p_amount         numeric,
  p_date           date,
  p_note           text default null
)
returns uuid
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid     uuid := require_user();
  v_from    wallets;
  v_to      wallets;
  v_pair_id uuid := gen_random_uuid();
  v_note    text;
begin
  if p_from_wallet_id is null or p_to_wallet_id is null then
    raise exception 'Pick both wallets.' using errcode = 'P0001';
  end if;
  if p_from_wallet_id = p_to_wallet_id then
    raise exception 'Source and destination must be different wallets.' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than 0.' using errcode = 'P0001';
  end if;

  perform 1 from wallets
    where user_id = v_uid and id in (p_from_wallet_id, p_to_wallet_id)
    order by id
    for update;

  select * into v_from from wallets where id = p_from_wallet_id and user_id = v_uid;
  if not found then
    raise exception 'Source wallet not found.' using errcode = 'P0001';
  end if;
  select * into v_to from wallets where id = p_to_wallet_id and user_id = v_uid;
  if not found then
    raise exception 'Destination wallet not found.' using errcode = 'P0001';
  end if;

  if v_from.balance < p_amount then
    raise exception '%', insufficient_balance_message(v_from) using errcode = 'P0001';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');

  insert into transactions (user_id, wallet_id, type, amount, note, transaction_date, transfer_pair_id)
  values
    (v_uid, p_from_wallet_id, 'expense', p_amount,
     coalesce(v_note, 'Transfer to ' || v_to.name), p_date, v_pair_id),
    (v_uid, p_to_wallet_id, 'income', p_amount,
     coalesce(v_note, 'Transfer from ' || v_from.name), p_date, v_pair_id);

  update wallets set balance = balance - p_amount where id = p_from_wallet_id and user_id = v_uid;
  update wallets set balance = balance + p_amount where id = p_to_wallet_id   and user_id = v_uid;

  perform assert_wallet_in_bounds(p_from_wallet_id);
  perform assert_wallet_in_bounds(p_to_wallet_id);

  return v_pair_id;
end;
$$;

-- =============================================================================
-- 5. Pay a credit card
--
-- On a credit wallet `balance` is the credit still available, so paying the
-- card raises it and the amount owed is limit - balance.
-- =============================================================================
create or replace function public.pay_credit_card(
  p_card_wallet_id uuid,
  p_from_wallet_id uuid,
  p_amount         numeric,
  p_date           date,
  p_note           text default null
)
returns numeric
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid     uuid := require_user();
  v_card    wallets;
  v_source  wallets;
  v_owed    numeric;
  v_pair_id uuid := gen_random_uuid();
  v_note    text;
begin
  if p_from_wallet_id is null then
    raise exception 'Pick the wallet the payment comes from.' using errcode = 'P0001';
  end if;
  if p_card_wallet_id = p_from_wallet_id then
    raise exception 'A card cannot pay itself.' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than 0.' using errcode = 'P0001';
  end if;

  perform 1 from wallets
    where user_id = v_uid and id in (p_card_wallet_id, p_from_wallet_id)
    order by id
    for update;

  select * into v_card from wallets where id = p_card_wallet_id and user_id = v_uid;
  if not found or v_card.type <> 'credit' then
    raise exception 'That wallet is not a credit card.' using errcode = 'P0001';
  end if;
  select * into v_source from wallets where id = p_from_wallet_id and user_id = v_uid;
  if not found then
    raise exception 'Source wallet not found.' using errcode = 'P0001';
  end if;

  v_owed := coalesce(v_card.credit_limit, 0) - v_card.balance;
  if v_owed <= 0 then
    raise exception '% has nothing outstanding to pay.', v_card.name using errcode = 'P0001';
  end if;
  if p_amount > v_owed then
    raise exception '% only owes %.', v_card.name, format_dong(v_owed) using errcode = 'P0001';
  end if;
  if v_source.balance < p_amount then
    raise exception '%', insufficient_balance_message(v_source) using errcode = 'P0001';
  end if;

  v_note := coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Credit card payment — ' || v_card.name);

  insert into transactions (user_id, wallet_id, type, amount, note, transaction_date, transfer_pair_id)
  values
    (v_uid, p_from_wallet_id, 'expense', p_amount, v_note, p_date, v_pair_id),
    (v_uid, p_card_wallet_id, 'income',  p_amount, v_note, p_date, v_pair_id);

  update wallets set balance = balance - p_amount where id = p_from_wallet_id and user_id = v_uid;
  update wallets set balance = balance + p_amount where id = p_card_wallet_id and user_id = v_uid;

  perform assert_wallet_in_bounds(p_from_wallet_id);
  perform assert_wallet_in_bounds(p_card_wallet_id);

  return v_card.balance + p_amount;
end;
$$;

-- =============================================================================
-- 6. Record a debt payment
--
-- The wallet is checked before anything is written. The old order recorded the
-- payment and lowered the debt first, so a wallet that could not cover it
-- answered with an error after the debt had already changed.
-- =============================================================================
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

  select * into v_debt from debts
    where id = p_debt_id and user_id = v_uid
    for update;
  if not found then
    raise exception 'Debt not found.' using errcode = 'P0001';
  end if;
  if v_debt.remaining_amount <= 0 then
    raise exception 'This debt is already fully paid.' using errcode = 'P0001';
  end if;
  if p_amount > v_debt.remaining_amount then
    raise exception 'That is more than the % still outstanding.',
      format_dong(v_debt.remaining_amount) using errcode = 'P0001';
  end if;

  v_wallet_id := coalesce(p_wallet_id, v_debt.wallet_id);

  if v_wallet_id is not null then
    select * into v_wallet from wallets
      where id = v_wallet_id and user_id = v_uid
      for update;
    if not found then
      raise exception 'Wallet not found.' using errcode = 'P0001';
    end if;

    -- Collecting money owed to you is income; paying someone back is an
    -- expense. The credit-card branch is carried over from the route this
    -- replaces, which always treated a card as restoring credit.
    v_tx_type := case
      when v_wallet.type = 'credit' then 'income'
      when v_debt.type = 'lend'     then 'income'
      else 'expense'
    end;

    if v_tx_type = 'expense' and v_wallet.balance < p_amount then
      raise exception '%', insufficient_balance_message(v_wallet) using errcode = 'P0001';
    end if;
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
