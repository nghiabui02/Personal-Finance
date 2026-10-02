-- =============================================================================
-- Every money function reports what it changed.
--
-- The web throws the result away and lets the server re-query, but a native
-- client keeps its own copy of the data and has to know which rows moved.
-- Without that it must re-read after every write, giving back the round trips
-- these functions were meant to save.
--
-- One envelope for all ten, so a client writes one decoder rather than ten:
--
--   transactions              rows created or changed, each with its category
--                             and wallet embedded (empty array, never null)
--   wallets                   [{id, balance}] for every balance that moved
--   debt                      the whole debts row when one was touched, else null
--   debt_payments             rows added or changed in a debt's payment history
--   deleted_*_ids             ids removed, so a local store can drop them
--
-- Each function also keeps the scalar it used to return, as a named key, so
-- callers reading those do not have to change at once.
--
-- The helpers these build on — transaction_json, wallet_balances_json,
-- debt_json — and the already converted delete_transaction are defined in
-- 20261002000004_money_result_json_helpers.sql.
-- =============================================================================

-- =============================================================================
-- 1. Create a transaction
-- =============================================================================
drop function if exists public.create_transaction(text, numeric, date, uuid, uuid, text, numeric);

create function public.create_transaction(
  p_type             text,
  p_amount           numeric,
  p_transaction_date date,
  p_category_id      uuid    default null,
  p_wallet_id        uuid    default null,
  p_note             text    default null,
  p_bank_fee         numeric default null
)
returns json
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

  return json_build_object(
    'transactions', json_build_array(transaction_json(v_row)),
    'wallets',      wallet_balances_json(array_remove(array[p_wallet_id], null))
  );
end;
$$;

-- =============================================================================
-- 2. Update a transaction
-- =============================================================================
drop function if exists public.update_transaction(uuid, text, numeric, date, uuid, uuid, text, numeric);

create function public.update_transaction(
  p_id               uuid,
  p_type             text,
  p_amount           numeric,
  p_transaction_date date,
  p_category_id      uuid    default null,
  p_wallet_id        uuid    default null,
  p_note             text    default null,
  p_bank_fee         numeric default null
)
returns json
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

    update debt_payments set amount = p_amount where id = v_payment.id
      returning * into v_payment;
    update debts
      set remaining_amount = v_new_remaining,
          status = case when v_new_remaining = 0 then 'completed' else 'active' end
      where id = v_debt.id and user_id = v_uid
      returning * into v_debt;
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

  -- Changing the amount moves the debt's history too, so the payment row goes
  -- back with the debt — a client showing both would otherwise keep the old
  -- figure in the list under a total that no longer matches it.
  return json_build_object(
    'transactions',  json_build_array(transaction_json(v_row)),
    'wallets',       wallet_balances_json(
                       array_remove(array[v_old.wallet_id, p_wallet_id], null)),
    'debt',          debt_json(v_debt),
    'debt_payments', case when v_payment.id is null then '[]'::json
                          else json_build_array(debt_payment_json(v_payment)) end
  );
end;
$$;

-- =============================================================================
-- 4. Transfer between two wallets
-- =============================================================================
drop function if exists public.transfer_funds(uuid, uuid, numeric, date, text);

create function public.transfer_funds(
  p_from_wallet_id uuid,
  p_to_wallet_id   uuid,
  p_amount         numeric,
  p_date           date,
  p_note           text default null
)
returns json
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid     uuid := require_user();
  v_from    wallets;
  v_to      wallets;
  v_pair_id uuid := gen_random_uuid();
  v_note    text;
  v_rows    json;
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

  select coalesce(json_agg(transaction_json(t.*) order by t.id), '[]'::json) into v_rows
    from transactions t
    where t.transfer_pair_id = v_pair_id and t.user_id = v_uid;

  return json_build_object(
    'transfer_pair_id', v_pair_id,
    'transactions',     v_rows,
    'wallets',          wallet_balances_json(array[p_from_wallet_id, p_to_wallet_id])
  );
end;
$$;

-- =============================================================================
-- 5. Pay a credit card
-- =============================================================================
drop function if exists public.pay_credit_card(uuid, uuid, numeric, date, text);

create function public.pay_credit_card(
  p_card_wallet_id uuid,
  p_from_wallet_id uuid,
  p_amount         numeric,
  p_date           date,
  p_note           text default null
)
returns json
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
  v_rows    json;
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

  select coalesce(json_agg(transaction_json(t.*) order by t.id), '[]'::json) into v_rows
    from transactions t
    where t.transfer_pair_id = v_pair_id and t.user_id = v_uid;

  return json_build_object(
    'new_available_credit', v_card.balance + p_amount,
    'transactions',         v_rows,
    'wallets',              wallet_balances_json(array[p_card_wallet_id, p_from_wallet_id])
  );
end;
$$;

-- =============================================================================
-- 7. Create a debt
-- =============================================================================
drop function if exists public.create_debt(text, text, numeric, date, text, date, text, uuid, uuid);

create function public.create_debt(
  p_type           text,
  p_person_name    text,
  p_amount         numeric,
  p_date           date,
  p_person_contact text default null,
  p_due_date       date default null,
  p_note           text default null,
  p_wallet_id      uuid default null,
  p_category_id    uuid default null
)
returns json
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid     uuid := require_user();
  v_name    text := btrim(coalesce(p_person_name, ''));
  v_wallet  wallets;
  v_tx_type text;
  v_debt    debts;
  v_row     transactions;
  v_rows    json := '[]'::json;
begin
  if p_type not in ('lend', 'borrow') then
    raise exception 'A debt is either lent or borrowed.' using errcode = 'P0001';
  end if;
  if v_name = '' then
    raise exception 'Enter who this debt is with.' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than 0.' using errcode = 'P0001';
  end if;

  v_tx_type := case when p_type = 'lend' then 'expense' else 'income' end;

  if p_wallet_id is not null then
    select * into v_wallet from wallets
      where id = p_wallet_id and user_id = v_uid
      for update;
    if not found then
      raise exception 'Wallet not found.' using errcode = 'P0001';
    end if;
    if v_tx_type = 'expense' and v_wallet.balance < p_amount then
      raise exception '%', insufficient_balance_message(v_wallet) using errcode = 'P0001';
    end if;
  end if;

  insert into debts (
    user_id, type, wallet_id, person_name, person_contact,
    amount, remaining_amount, due_date, note, status
  ) values (
    v_uid, p_type, p_wallet_id, v_name, nullif(btrim(coalesce(p_person_contact, '')), ''),
    p_amount, p_amount, p_due_date, nullif(btrim(coalesce(p_note, '')), ''), 'active'
  )
  returning * into v_debt;

  if p_wallet_id is not null then
    insert into transactions (
      user_id, type, amount, wallet_id, transaction_date, note, category_id
    ) values (
      v_uid, v_tx_type, p_amount, p_wallet_id, p_date,
      case when p_type = 'lend' then 'Lent to ' || v_name else 'Borrowed from ' || v_name end,
      p_category_id
    )
    returning * into v_row;

    update wallets
      set balance = balance + case when v_tx_type = 'income' then p_amount else -p_amount end
      where id = p_wallet_id and user_id = v_uid;
    perform assert_wallet_in_bounds(p_wallet_id);

    v_rows := json_build_array(transaction_json(v_row));
  end if;

  return json_build_object(
    'debt',         debt_json(v_debt),
    'transactions', v_rows,
    'wallets',      wallet_balances_json(array_remove(array[p_wallet_id], null))
  );
end;
$$;

-- =============================================================================
-- 8. Lend or borrow more against an existing debt
-- =============================================================================
drop function if exists public.add_to_debt(uuid, numeric, date, uuid, uuid, text);

create function public.add_to_debt(
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
  v_payment   debt_payments;
  v_row       transactions;
  v_rows      json := '[]'::json;
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
  values (p_debt_id, p_amount, nullif(btrim(coalesce(p_note, '')), ''), p_date::timestamptz, 'addition')
  returning * into v_payment;

  update debts
    set amount = v_new_total, remaining_amount = v_new_rem, status = 'active'
    where id = p_debt_id and user_id = v_uid
    returning * into v_debt;

  if p_wallet_id is not null then
    insert into transactions (
      user_id, type, amount, wallet_id, transaction_date, note, category_id
    ) values (
      v_uid, v_tx_type, p_amount, p_wallet_id, p_date, v_note, p_category_id
    )
    returning * into v_row;

    update wallets
      set balance = balance + case when v_tx_type = 'income' then p_amount else -p_amount end
      where id = p_wallet_id and user_id = v_uid;
    perform assert_wallet_in_bounds(p_wallet_id);

    v_rows := json_build_array(transaction_json(v_row));
  end if;

  return json_build_object(
    'amount',           v_new_total,
    'remaining_amount', v_new_rem,
    'debt',             debt_json(v_debt),
    'debt_payments',    json_build_array(debt_payment_json(v_payment)),
    'transactions',     v_rows,
    'wallets',          wallet_balances_json(array_remove(array[p_wallet_id], null))
  );
end;
$$;

-- =============================================================================
-- 6. Record a debt payment
-- =============================================================================
drop function if exists public.record_debt_payment(uuid, numeric, date, uuid, uuid, text);

create function public.record_debt_payment(
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
  v_payment       debt_payments;
  v_note          text;
  v_row           transactions;
  v_rows          json := '[]'::json;
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
  returning * into v_payment;

  update debts
    set remaining_amount = v_new_remaining,
        status = case when v_new_remaining = 0 then 'completed' else status end
    where id = p_debt_id and user_id = v_uid
    returning * into v_debt;

  if v_wallet_id is not null then
    insert into transactions (
      user_id, wallet_id, category_id, type, amount, note, transaction_date, debt_payment_id
    ) values (
      v_uid, v_wallet_id, p_category_id, v_tx_type, p_amount, v_note, p_date, v_payment.id
    )
    returning * into v_row;

    update wallets
      set balance = balance + case when v_tx_type = 'income' then p_amount else -p_amount end
      where id = v_wallet_id and user_id = v_uid;
    perform assert_wallet_in_bounds(v_wallet_id);

    v_rows := json_build_array(transaction_json(v_row));
  end if;

  return json_build_object(
    'remaining_amount', v_new_remaining,
    'settled',          v_new_remaining = 0,
    'debt',             debt_json(v_debt),
    'debt_payments',    json_build_array(debt_payment_json(v_payment)),
    'transactions',     v_rows,
    'wallets',          wallet_balances_json(array_remove(array[v_wallet_id], null))
  );
end;
$$;

-- =============================================================================
-- 9. Delete a wallet
--
-- `transactions` carries only the pair that moved the remaining balance out.
-- Deleting a wallet also sets wallet_id to null on every transaction, debt and
-- recurring rule that pointed at it — that is the foreign key, not this
-- function, and there can be thousands of them. Listing them all would turn a
-- delete into an unbounded payload.
--
-- So the contract is the other way round: on seeing an id in
-- `deleted_wallet_ids`, a client clears wallet_id on its own rows in those
-- three tables. The rows keep their history, they just no longer name a wallet.
-- ==============================================================================
drop function if exists public.delete_wallet(uuid, date);

create function public.delete_wallet(p_wallet_id uuid, p_date date default null)
returns json
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
  v_pair_id    uuid;
  v_date       date := coalesce(p_date, (now() at time zone 'Asia/Ho_Chi_Minh')::date);
  v_rows       json := '[]'::json;
  v_moved      uuid[] := '{}';
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

    v_pair_id := gen_random_uuid();

    insert into transactions (user_id, wallet_id, type, amount, note, transaction_date, transfer_pair_id)
    values
      (v_uid, p_wallet_id, 'expense', v_wallet.balance,
       'Balance transferred to default wallet', v_date, v_pair_id),
      (v_uid, v_default.id, 'income', v_wallet.balance,
       'Balance transferred from deleted wallet', v_date, v_pair_id);

    update wallets set balance = balance + v_wallet.balance
      where id = v_default.id and user_id = v_uid;
    perform assert_wallet_in_bounds(v_default.id);

    v_moved := array[v_default.id];
  end if;

  delete from wallets where id = p_wallet_id and user_id = v_uid;

  -- Read after the delete: the leg belonging to the removed wallet has had its
  -- wallet_id set to null by the foreign key, and that is the row a client has
  -- to store.
  if v_pair_id is not null then
    select coalesce(json_agg(transaction_json(t.*) order by t.id), '[]'::json) into v_rows
      from transactions t
      where t.transfer_pair_id = v_pair_id and t.user_id = v_uid;
  end if;

  -- See the note above this function: every other row that pointed at this
  -- wallet now has wallet_id null, and the client clears its own by id rather
  -- than receiving them all here.
  return json_build_object(
    'deleted_wallet_ids', to_json(array[p_wallet_id]),
    'transactions',       v_rows,
    'wallets',            wallet_balances_json(v_moved)
  );
end;
$$;

-- =============================================================================
-- 10. Reconcile a wallet against the bank
-- =============================================================================
drop function if exists public.reconcile_wallet(uuid, numeric, date, uuid, uuid, text);

create function public.reconcile_wallet(
  p_wallet_id      uuid,
  p_actual_balance numeric,
  p_date           date,
  p_category_up    uuid default null,
  p_category_down  uuid default null,
  p_note           text default null
)
returns json
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid         uuid := require_user();
  v_wallet      wallets;
  v_delta       numeric;
  v_category_id uuid;
  v_direction   text;
  v_row         transactions;
begin
  if p_actual_balance is null then
    raise exception 'Enter the balance shown by your bank.' using errcode = 'P0001';
  end if;

  select * into v_wallet from wallets
    where id = p_wallet_id and user_id = v_uid
    for update;
  if not found then
    raise exception 'Wallet not found.' using errcode = 'P0001';
  end if;

  if v_wallet.type = 'credit' then
    if p_actual_balance < 0 or p_actual_balance > coalesce(v_wallet.credit_limit, 0) then
      raise exception 'Available credit must be between 0 and %.',
        format_dong(coalesce(v_wallet.credit_limit, 0)) using errcode = 'P0001';
    end if;
  elsif p_actual_balance < 0 then
    raise exception 'A balance cannot be negative.' using errcode = 'P0001';
  end if;

  v_delta := p_actual_balance - v_wallet.balance;
  if v_delta = 0 then
    return json_build_object(
      'ok', true, 'delta', 0,
      'message',      'Already matches — nothing to adjust.',
      'transactions', '[]'::json,
      'wallets',      wallet_balances_json(array[p_wallet_id])
    );
  end if;

  -- The caller passes a category per direction, because which way the gap goes
  -- is only known once the locked balance has been read.
  v_direction   := case when v_delta > 0 then 'income' else 'expense' end;
  v_category_id := case when v_delta > 0 then p_category_up else p_category_down end;
  if v_category_id is null then
    raise exception 'That category does not match the direction of this change.' using errcode = 'P0001';
  end if;

  -- Checked here rather than left to the caller: a client that picks its
  -- category some other way would otherwise file an income row under an expense
  -- category, and nothing downstream would notice.
  if not exists (
    select 1 from categories c
    where c.id = v_category_id
      and c.type = v_direction
      and (c.user_id = v_uid or c.user_id is null)
  ) then
    raise exception 'That category does not match the direction of this change.' using errcode = 'P0001';
  end if;

  insert into transactions (
    user_id, wallet_id, category_id, type, amount, note, transaction_date
  ) values (
    v_uid, p_wallet_id, v_category_id, v_direction, abs(v_delta),
    coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Reconciled ' || v_wallet.name),
    p_date
  )
  returning * into v_row;

  update wallets set balance = p_actual_balance
    where id = p_wallet_id and user_id = v_uid;
  perform assert_wallet_in_bounds(p_wallet_id);

  return json_build_object(
    'ok',           true,
    'delta',        v_delta,
    'new_balance',  p_actual_balance,
    'transactions', json_build_array(transaction_json(v_row)),
    'wallets',      wallet_balances_json(array[p_wallet_id])
  );
end;
$$;
