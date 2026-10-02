-- =============================================================================
-- Atomic money movements, part 2
--
-- The four paths left over from 20261002000000: creating a debt, lending or
-- borrowing more against one, deleting a wallet, and reconciling a wallet
-- against the bank. Same contract as part 1 — one database transaction per
-- movement, SELECT ... FOR UPDATE on every wallet touched, SECURITY INVOKER so
-- row-level security still applies and the acting user comes from auth.uid().
-- User-facing refusals are raised with SQLSTATE P0001.
-- =============================================================================

-- =============================================================================
-- 7. Create a debt
--
-- Lending money is an expense that leaves a wallet; borrowing is income that
-- lands in one. The debt row, the transaction and the balance move together.
-- =============================================================================
create or replace function public.create_debt(
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
returns debts
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid     uuid := require_user();
  v_name    text := btrim(coalesce(p_person_name, ''));
  v_wallet  wallets;
  v_tx_type text;
  v_debt    debts;
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
    );

    update wallets
      set balance = balance + case when v_tx_type = 'income' then p_amount else -p_amount end
      where id = p_wallet_id and user_id = v_uid;
    perform assert_wallet_in_bounds(p_wallet_id);
  end if;

  return v_debt;
end;
$$;

-- =============================================================================
-- 8. Lend or borrow more against an existing debt
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

  select * into v_debt from debts
    where id = p_debt_id and user_id = v_uid
    for update;
  if not found then
    raise exception 'Debt not found.' using errcode = 'P0001';
  end if;

  v_tx_type := case when v_debt.type = 'lend' then 'expense' else 'income' end;

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

-- =============================================================================
-- 9. Delete a wallet
--
-- Money left in it moves to the default wallet and is recorded as a transfer
-- pair, so the ledger still explains where it went. Transactions keep their
-- history: the foreign key sets wallet_id to null rather than deleting them.
-- =============================================================================
create or replace function public.delete_wallet(p_wallet_id uuid)
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
begin
  select * into v_wallet from wallets
    where id = p_wallet_id and user_id = v_uid
    for update;
  if not found then
    raise exception 'Wallet not found.' using errcode = 'P0001';
  end if;

  -- Deleting a card that still owes would drop the debt out of net worth and
  -- make the user look richer than they are.
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
       'Balance transferred to default wallet', current_date, v_pair_id),
      (v_uid, v_default.id, 'income', v_wallet.balance,
       'Balance transferred from deleted wallet', current_date, v_pair_id);

    update wallets set balance = balance + v_wallet.balance
      where id = v_default.id and user_id = v_uid;
    perform assert_wallet_in_bounds(v_default.id);
  end if;

  delete from wallets where id = p_wallet_id and user_id = v_uid;
end;
$$;

-- =============================================================================
-- 10. Reconcile a wallet against the bank
--
-- The recorded balance is derived from transactions, so fees, interest and
-- forgotten spends make it drift. The gap becomes one adjustment transaction
-- rather than the balance being overwritten, so the history still adds up.
-- =============================================================================
create or replace function public.reconcile_wallet(
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
    return json_build_object('ok', true, 'delta', 0,
      'message', 'Already matches — nothing to adjust.');
  end if;

  -- The caller picks the category per direction, because which way the gap
  -- goes is only known once the locked balance has been read.
  v_category_id := case when v_delta > 0 then p_category_up else p_category_down end;
  if v_category_id is null then
    raise exception 'That category does not match the direction of this change.' using errcode = 'P0001';
  end if;

  insert into transactions (
    user_id, wallet_id, category_id, type, amount, note, transaction_date
  ) values (
    v_uid, p_wallet_id, v_category_id,
    case when v_delta > 0 then 'income' else 'expense' end,
    abs(v_delta),
    coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Reconciled ' || v_wallet.name),
    p_date
  );

  update wallets set balance = p_actual_balance
    where id = p_wallet_id and user_id = v_uid;
  perform assert_wallet_in_bounds(p_wallet_id);

  return json_build_object('ok', true, 'delta', v_delta, 'new_balance', p_actual_balance);
end;
$$;
