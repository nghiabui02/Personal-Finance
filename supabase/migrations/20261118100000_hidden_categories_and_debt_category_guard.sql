-- =============================================================================
-- Hide default categories, and keep debt categories tied to a debt.
--
-- 1. user_hidden_categories: a shared starter category cannot hold per-user
--    state, so "hidden" lives in its own table. Hiding only removes a category
--    from the choices for NEW records; nothing that references it changes.
--    Rollback: drop the table.
--
-- 2. create_transaction / update_transaction refuse a Lend / Borrow / Collect
--    Debt / Repay Debt category that is new or changed. The debt functions
--    insert their own transactions directly and are unaffected. The functions
--    below are the 20261003000000 versions plus the marked check.
--
-- 3. Recurring rules already filed under a debt category are paused, so the
--    nightly job neither creates unlinked debt transactions nor fails on each
--    run. They keep their category, amount and schedule.
-- =============================================================================

-- =============================================================================
-- 1. Hidden default categories
-- =============================================================================
create table public.user_hidden_categories (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (user_id, category_id)
);

alter table public.user_hidden_categories enable row level security;

create policy "user_hidden_categories: read own"
  on public.user_hidden_categories for select
  using (auth.uid() = user_id);

-- Only a shared default can be hidden. System categories are per-user rows
-- with a system_key, so they fall outside this check.
create policy "user_hidden_categories: hide shared defaults"
  on public.user_hidden_categories for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.categories c
      where c.id = category_id and c.user_id is null and c.system_key is null
    )
  );

create policy "user_hidden_categories: show own"
  on public.user_hidden_categories for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- 2. Debt categories need a debt
-- =============================================================================
-- DC001 is a dedicated SQLSTATE: the API maps it to a translated message
-- instead of showing this English text.
create function public.assert_not_debt_category(p_category_id uuid) returns void
language plpgsql stable
set search_path to 'public'
as $$
begin
  if p_category_id is not null and exists (
    select 1 from categories
    where id = p_category_id
      and system_key in ('lend_out', 'borrow_in', 'collect_debt', 'repay_debt')
  ) then
    raise exception 'A debt category can only be used through a debt.' using errcode = 'DC001';
  end if;
end;
$$;

create or replace function public.create_transaction(
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

  perform assert_not_debt_category(p_category_id);

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

  -- Only a new or changed category is refused, so a legacy row that already
  -- sits in a debt category stays editable.
  if p_category_id is distinct from v_old.category_id then
    perform assert_not_debt_category(p_category_id);
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
-- 3. Pause recurring rules filed under a debt category
-- =============================================================================
update public.recurring_transactions
set active = false
where active
  and category_id in (
    select id from public.categories
    where system_key in ('lend_out', 'borrow_in', 'collect_debt', 'repay_debt')
  );
