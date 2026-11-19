-- Coordinated clean-ledger cut-over. Apply only after the approved reset and
-- verified backup, in the SAME transaction, with every writer stopped.
-- The public baseline is supabase/baselines/20261119_pre_membership.sql.
set local lock_timeout = '5s';

-- An ordinary migration run must never erase the existing ledger by inference.
do $$
begin
  if exists (select 1 from public.transactions)
    or exists (select 1 from public.wallets)
    or exists (select 1 from public.budgets)
    or exists (select 1 from public.recurring_transactions)
    or exists (select 1 from public.debts)
    or exists (select 1 from public.debt_payments)
    or exists (select 1 from public.saving_goals)
    or exists (select 1 from public.bank_statement_imports)
    or exists (select 1 from public.ai_insights_cache)
    or exists (select 1 from public.net_worth_snapshots)
    or exists (select 1 from public.notification_states)
    or exists (select 1 from public.user_hidden_categories)
    or exists (select 1 from public.categories)
  then
    raise exception 'Membership cut-over requires an explicitly approved empty-ledger reset. Stop writers and follow the deployment runbook.';
  end if;
end;
$$;

-- Retain the old hidden table for the separately reviewed cleanup; its reset
-- state is empty and it no longer controls selection.
drop policy "user_hidden_categories: hide shared defaults" on public.user_hidden_categories;
revoke insert, update, delete on public.user_hidden_categories from anon, authenticated;
drop trigger transactions_reject_template_category on public.transactions;
drop trigger budgets_reject_template_category on public.budgets;
drop trigger recurring_transactions_reject_template_category on public.recurring_transactions;
drop trigger categories_guard_provenance on public.categories;
drop trigger categories_custom_name on public.categories;
drop function public.reject_template_category();
drop function public.guard_category_provenance();
drop function public.mark_category_custom_name();
drop function public.adopt_category(uuid);

alter table public.transactions drop constraint transactions_category_id_fkey;
alter table public.budgets drop constraint budgets_category_id_fkey;
alter table public.recurring_transactions drop constraint recurring_transactions_category_id_fkey;
alter table public.transactions rename column category_id to user_category_id;
alter table public.budgets rename column category_id to user_category_id;
alter table public.recurring_transactions rename column category_id to user_category_id;
-- The live schema has two equivalent budget constraints; retain one.
alter table public.budgets drop constraint if exists budgets_user_category_month_unique;
alter table public.budgets rename constraint budgets_user_id_category_id_month_key to budgets_user_category_month_unique;

-- Catalog rows contain no personal state. Existing default-key restrictions
-- are replaced by the reviewed manifest's stable key syntax and unique key.
drop policy "categories: read system and own" on public.categories;
drop policy "categories: insert own" on public.categories;
drop policy "categories: update own" on public.categories;
drop policy "categories: delete own" on public.categories;
alter table public.categories
  drop column source_template_id,
  drop column parent_id,
  drop column user_id,
  drop column name,
  drop column is_default,
  drop column system_key,
  drop column name_is_custom,
  drop constraint categories_default_key_check,
  alter column default_key set not null,
  add constraint categories_default_key_format check (default_key ~ '^[a-z][a-z0-9_]*$'),
  add constraint categories_key_unique unique (default_key),
  add column name_vi text not null check (btrim(name_vi) <> ''),
  add column name_en text not null check (btrim(name_en) <> ''),
  add column collection text not null,
  add column search_aliases text[] not null default '{}',
  add column is_available boolean not null default true;
create policy "categories: read catalog" on public.categories for select to authenticated using (true);
revoke all on public.categories from anon, authenticated;
grant select on public.categories to authenticated;

create table public.user_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete restrict,
  name text check (name is null or btrim(name) <> ''),
  type text not null check (type in ('income', 'expense')),
  system_key text check (system_key in ('lend_out', 'borrow_in', 'collect_debt', 'repay_debt', 'adjust_up', 'adjust_down')),
  icon text,
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint user_categories_origin check (
    (category_id is null or system_key is null)
    and (category_id is not null or system_key is not null or name is not null)
  ),
  constraint user_categories_owner_id unique (user_id, id),
  constraint user_categories_template_unique unique (user_id, category_id),
  constraint user_categories_system_unique unique (user_id, system_key)
);
create index user_categories_template on public.user_categories(category_id);
alter table public.user_categories enable row level security;
create policy "user_categories: read own" on public.user_categories for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_categories: create private" on public.user_categories for insert to authenticated
  with check ((select auth.uid()) = user_id and category_id is null and system_key is null);
create policy "user_categories: edit own" on public.user_categories for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.user_categories from anon, authenticated;
grant select on public.user_categories to authenticated;
grant insert (user_id, name, type, icon, color) on public.user_categories to authenticated;
grant update (name, icon, color, is_active) on public.user_categories to authenticated;
grant all on public.user_categories to service_role;

alter table public.transactions add constraint transactions_user_category_owner
  foreign key (user_id, user_category_id) references public.user_categories(user_id, id) on delete restrict;
alter table public.budgets add constraint budgets_user_category_owner
  foreign key (user_id, user_category_id) references public.user_categories(user_id, id) on delete restrict;
alter table public.recurring_transactions add constraint recurring_user_category_owner
  foreign key (user_id, user_category_id) references public.user_categories(user_id, id) on delete restrict;
create index recurring_user_category on public.recurring_transactions(user_id, user_category_id);

-- Every new writer takes a SHARE lock on the membership. Removal needs the
-- conflicting row-update lock, so it sees dependencies committed before it.
create function public.guard_user_category_reference() returns trigger
language plpgsql set search_path = public as $$
declare
  v_category user_categories;
  v_existing boolean := false;
  v_activating boolean := false;
begin
  if new.user_category_id is null then return new; end if;
  select * into v_category from user_categories
    where id = new.user_category_id and user_id = new.user_id for share;
  if not found then
    raise exception 'Choose an owner-matched category of the correct type.' using errcode = 'UC001';
  end if;
  if tg_table_name = 'budgets' then
    if v_category.type <> 'expense' then
      raise exception 'A budget requires an expense category.' using errcode = 'UC001';
    end if;
  elsif v_category.type <> new.type then
    raise exception 'Choose a category of the correct type.' using errcode = 'UC001';
  end if;
  if tg_op = 'UPDATE' then
    v_existing := old.user_category_id is not distinct from new.user_category_id and old.user_id = new.user_id;
    if tg_table_name in ('budgets', 'recurring_transactions') then
      v_activating := new.active and not old.active;
    end if;
  end if;
  if not v_category.is_active and (not v_existing or v_activating) then
    raise exception 'Restore this category before using it.' using errcode = 'UC002';
  end if;
  if tg_table_name = 'recurring_transactions' then
    if v_category.system_key in ('lend_out', 'borrow_in', 'collect_debt', 'repay_debt') and (not v_existing or new.active) then
      raise exception 'A debt category can only be used through a debt.' using errcode = 'DC001';
    end if;
  end if;
  return new;
end;
$$;
create trigger transactions_user_category_guard before insert or update on public.transactions
  for each row execute function public.guard_user_category_reference();
create trigger budgets_user_category_guard before insert or update on public.budgets
  for each row execute function public.guard_user_category_reference();
create trigger recurring_user_category_guard before insert or update on public.recurring_transactions
  for each row execute function public.guard_user_category_reference();

create function public.guard_user_category() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_template categories;
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.user_id is distinct from old.user_id
      or new.category_id is distinct from old.category_id or new.system_key is distinct from old.system_key
      or new.type is distinct from old.type then
      raise exception 'A category cannot change its owner, origin or accounting type.' using errcode = 'UC004';
    end if;
    if old.is_active and not new.is_active then
      if old.system_key is not null then
        raise exception 'System categories cannot be removed.' using errcode = 'UC004';
      end if;
      if exists (select 1 from budgets where user_id = old.user_id and user_category_id = old.id and active
          and month = date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')::date)
        or exists (select 1 from recurring_transactions where user_id = old.user_id and user_category_id = old.id and active) then
        raise exception 'Pause or change active dependencies before removing this category.' using errcode = 'UC003';
      end if;
    end if;
  end if;
  if new.category_id is not null then
    select * into v_template from categories where id = new.category_id for share;
    if not found then raise exception 'Unknown Store template.' using errcode = 'UC005'; end if;
    if (tg_op = 'INSERT' or (new.is_active and not old.is_active)) and not v_template.is_available then
      raise exception 'This template is no longer available.' using errcode = 'UC005';
    end if;
    if tg_op = 'INSERT' then new.type := v_template.type; end if;
  elsif new.system_key is not null then
    new.type := case when new.system_key in ('borrow_in', 'collect_debt', 'adjust_up') then 'income' else 'expense' end;
    if not new.is_active then raise exception 'System categories cannot be removed.' using errcode = 'UC004'; end if;
  end if;
  return new;
end;
$$;
create trigger user_categories_guard before insert or update on public.user_categories
  for each row execute function public.guard_user_category();

-- Only the narrowly scoped definer functions may create Store/system origins.
-- Column grants and RLS reject client attempts to forge those fields.
create function public.ensure_system_category(p_key text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := require_user();
  v_id uuid;
  v_icon text;
  v_color text;
begin
  if p_key is null or p_key not in ('lend_out', 'borrow_in', 'collect_debt', 'repay_debt', 'adjust_up', 'adjust_down') then
    raise exception 'Unknown system category.' using errcode = 'UC001';
  end if;
  v_icon := case p_key when 'lend_out' then '💸' when 'borrow_in' then '🤝' when 'collect_debt' then '💰' when 'repay_debt' then '🏦' else '⚖️' end;
  v_color := case p_key when 'lend_out' then '#6366f1' when 'borrow_in' then '#f97316' when 'collect_debt' then '#10b981' when 'repay_debt' then '#ef4444' else '#64748b' end;
  insert into user_categories(user_id, system_key, type, icon, color)
    values (v_uid, p_key, case when p_key in ('borrow_in', 'collect_debt', 'adjust_up') then 'income' else 'expense' end, v_icon, v_color)
    on conflict (user_id, system_key) do nothing;
  select id into v_id from user_categories where user_id = v_uid and system_key = p_key;
  return v_id;
end;
$$;
revoke all on function public.ensure_system_category(text) from public, anon;
grant execute on function public.ensure_system_category(text) to authenticated;

create function public.adopt_categories(p_template_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := require_user();
  v_template categories;
  v_id uuid;
  v_ids uuid[] := '{}';
begin
  if coalesce(cardinality(p_template_ids), 0) = 0 or array_position(p_template_ids, null) is not null then
    raise exception 'Select at least one Store category.' using errcode = 'UC001';
  end if;
  -- Stable order prevents two overlapping batches from locking in reverse order.
  for v_id in select distinct unnest(p_template_ids) order by 1 loop
    select * into v_template from categories where id = v_id and is_available for share;
    if not found then raise exception 'A selected template is unavailable.' using errcode = 'UC005'; end if;
    insert into user_categories(user_id, category_id, type, icon, color)
      values(v_uid, v_id, v_template.type, v_template.icon, v_template.color)
      on conflict(user_id, category_id) do update set is_active = true
        where not user_categories.is_active;
    v_ids := array_append(v_ids, v_id);
  end loop;
  return (select coalesce(jsonb_agg(to_jsonb(u) || jsonb_build_object('template', jsonb_build_object('default_key', c.default_key))), '[]'::jsonb)
    from user_categories u join categories c on c.id = u.category_id where u.user_id = v_uid and u.category_id = any(v_ids));
end;
$$;
revoke all on function public.adopt_categories(uuid[]) from public, anon;
grant execute on function public.adopt_categories(uuid[]) to authenticated;

create or replace function public.transaction_json(p_tx public.transactions) returns json
language sql stable set search_path = public as $$
  select (to_jsonb(p_tx) || jsonb_build_object(
    'categories', (select jsonb_build_object('id', u.id, 'name', u.name, 'icon', u.icon, 'color', u.color,
      'system_key', u.system_key, 'is_active', u.is_active,
      'template', (select jsonb_build_object('default_key', c.default_key) from categories c where c.id = u.category_id))
      from user_categories u where u.id = p_tx.user_category_id and u.user_id = p_tx.user_id),
    'wallets', (select jsonb_build_object('id', w.id, 'name', w.name) from wallets w where w.id = p_tx.wallet_id)
  ))::json;
$$;
drop function public.create_debt(text, text, numeric, date, text, date, text, uuid, uuid);

CREATE OR REPLACE FUNCTION public.create_debt(p_type text, p_person_name text, p_amount numeric, p_date date, p_person_contact text DEFAULT NULL::text, p_due_date date DEFAULT NULL::date, p_note text DEFAULT NULL::text, p_wallet_id uuid DEFAULT NULL::uuid, p_user_category_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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

  p_user_category_id := ensure_system_category(case when p_type = 'lend' then 'lend_out' else 'borrow_in' end);

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
      user_id, type, amount, wallet_id, transaction_date, note, user_category_id
    ) values (
      v_uid, v_tx_type, p_amount, p_wallet_id, p_date,
      case when p_type = 'lend' then 'Lent to ' || v_name else 'Borrowed from ' || v_name end,
      p_user_category_id
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
$function$
;

revoke all on function public.create_debt(text, text, numeric, date, text, date, text, uuid, uuid) from public, anon;
grant execute on function public.create_debt(text, text, numeric, date, text, date, text, uuid, uuid) to authenticated, service_role;

drop function public.add_to_debt(uuid, numeric, date, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.add_to_debt(p_debt_id uuid, p_amount numeric, p_date date, p_wallet_id uuid DEFAULT NULL::uuid, p_user_category_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
  p_user_category_id := ensure_system_category(case when v_debt.type = 'lend' then 'lend_out' else 'borrow_in' end);

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
      user_id, type, amount, wallet_id, transaction_date, note, user_category_id, debt_payment_id
    ) values (
      v_uid, v_tx_type, p_amount, p_wallet_id, p_date, v_note, p_user_category_id, v_payment.id
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
$function$
;

revoke all on function public.add_to_debt(uuid, numeric, date, uuid, uuid, text) from public, anon;
grant execute on function public.add_to_debt(uuid, numeric, date, uuid, uuid, text) to authenticated, service_role;

drop function public.record_debt_payment(uuid, numeric, date, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.record_debt_payment(p_debt_id uuid, p_amount numeric, p_date date, p_wallet_id uuid DEFAULT NULL::uuid, p_user_category_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
  p_user_category_id := ensure_system_category(case when v_debt.type = 'lend' then 'collect_debt' else 'repay_debt' end);

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
      user_id, wallet_id, user_category_id, type, amount, note, transaction_date, debt_payment_id
    ) values (
      v_uid, v_wallet_id, p_user_category_id, v_tx_type, p_amount, v_note, p_date, v_payment.id
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
$function$
;

revoke all on function public.record_debt_payment(uuid, numeric, date, uuid, uuid, text) from public, anon;
grant execute on function public.record_debt_payment(uuid, numeric, date, uuid, uuid, text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reconcile_wallet(p_wallet_id uuid, p_actual_balance numeric, p_date date, p_category_up uuid DEFAULT NULL::uuid, p_category_down uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
  perform assert_not_debt_category(v_category_id);

  -- Checked here rather than left to the caller: a client that picks its
  -- category some other way would otherwise file an income row under an expense
  -- category, and nothing downstream would notice.
  if not exists (
    select 1 from user_categories c
    where c.id = v_category_id
      and c.type = v_direction
      and c.user_id = v_uid and c.is_active
  ) then
    raise exception 'That category does not match the direction of this change.' using errcode = 'P0001';
  end if;

  insert into transactions (
    user_id, wallet_id, user_category_id, type, amount, note, transaction_date
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
$function$
;

revoke all on function public.reconcile_wallet(uuid, numeric, date, uuid, uuid, text) from public, anon;
grant execute on function public.reconcile_wallet(uuid, numeric, date, uuid, uuid, text) to authenticated, service_role;

drop function public.assert_not_debt_category(uuid);

CREATE OR REPLACE FUNCTION public.assert_not_debt_category(p_user_category_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
begin
  if p_user_category_id is not null and exists (
    select 1 from user_categories
    where id = p_user_category_id
      and system_key in ('lend_out', 'borrow_in', 'collect_debt', 'repay_debt')
  ) then
    raise exception 'A debt category can only be used through a debt.' using errcode = 'DC001';
  end if;
end;
$function$
;

revoke all on function public.assert_not_debt_category(uuid) from public, anon;
grant execute on function public.assert_not_debt_category(uuid) to authenticated, service_role;

drop function public.create_transaction(text, numeric, date, uuid, uuid, text, numeric);

CREATE OR REPLACE FUNCTION public.create_transaction(p_type text, p_amount numeric, p_transaction_date date, p_user_category_id uuid DEFAULT NULL::uuid, p_wallet_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text, p_bank_fee numeric DEFAULT NULL::numeric)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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

  perform assert_not_debt_category(p_user_category_id);

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
    user_id, type, amount, bank_fee, user_category_id, wallet_id, transaction_date, note
  ) values (
    v_uid, p_type, v_total, v_fee, p_user_category_id, p_wallet_id,
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
$function$
;

revoke all on function public.create_transaction(text, numeric, date, uuid, uuid, text, numeric) from public, anon;
grant execute on function public.create_transaction(text, numeric, date, uuid, uuid, text, numeric) to authenticated, service_role;

drop function public.update_transaction(uuid, text, numeric, date, uuid, uuid, text, numeric);

CREATE OR REPLACE FUNCTION public.update_transaction(p_id uuid, p_type text, p_amount numeric, p_transaction_date date, p_user_category_id uuid DEFAULT NULL::uuid, p_wallet_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text, p_bank_fee numeric DEFAULT NULL::numeric)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
    if p_user_category_id is distinct from v_old.user_category_id then
      raise exception 'A debt repayment keeps its category — that is what ties it to the debt.'
        using errcode = 'P0001';
    end if;
    if v_fee is not null then
      raise exception 'A debt repayment cannot carry a bank fee.' using errcode = 'P0001';
    end if;
  end if;

  -- Only a new or changed category is refused, so a legacy row that already
  -- sits in a debt category stays editable.
  if p_user_category_id is distinct from v_old.user_category_id then
    perform assert_not_debt_category(p_user_category_id);
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
        user_category_id      = p_user_category_id,
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
$function$
;

revoke all on function public.update_transaction(uuid, text, numeric, date, uuid, uuid, text, numeric) from public, anon;
grant execute on function public.update_transaction(uuid, text, numeric, date, uuid, uuid, text, numeric) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.import_bank_statement_row(p_wallet_id uuid, p_entry jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := require_user();
  v_existing bank_statement_imports;
  v_result json;
  v_transaction_id uuid;
begin
  perform 1 from wallets where id = p_wallet_id and user_id = v_uid and type = 'bank' for update;
  if not found then
    raise exception 'Choose one of your bank wallets.' using errcode = 'P0001';
  end if;
  select * into v_existing from bank_statement_imports
    where user_id = v_uid and wallet_id = p_wallet_id and source_key = p_entry->>'source_key';
  if found then
    if v_existing.amount <> (p_entry->>'amount')::numeric
      or v_existing.type <> p_entry->>'type'
      or v_existing.transaction_date <> (p_entry->>'date')::date then
      raise exception 'A previously imported bank reference has different data. Check the CSV.' using errcode = 'P0001';
    end if;
    return false;
  end if;
  if nullif(btrim(p_entry->>'title'), '') is null or length(p_entry->>'title') > 500 then
    raise exception 'Enter a title of at most 500 characters for every selected transaction.' using errcode = 'P0001';
  end if;
  if nullif(p_entry->>'user_category_id', '') is not null and not exists (
    select 1 from user_categories where id = (p_entry->>'user_category_id')::uuid
      and type = p_entry->>'type' and user_id = v_uid and is_active
      and system_key is null
  ) then
    raise exception 'Choose an income/expense category belonging to you or a shared category.' using errcode = 'P0001';
  end if;
  v_result := to_json(create_transaction(
    p_entry->>'type', (p_entry->>'amount')::numeric, (p_entry->>'date')::date,
    nullif(p_entry->>'user_category_id', '')::uuid, p_wallet_id, btrim(p_entry->>'title')
  ));
  -- Accept both return shapes supported by the web during the RPC migration.
  v_transaction_id := coalesce(v_result->'transactions'->0->>'id', v_result->>'id')::uuid;
  if v_transaction_id is null then
    raise exception 'Transaction creation returned no ID. Update the money functions before importing.';
  end if;
  insert into bank_statement_imports (
    user_id, wallet_id, source_key, transaction_id, transaction_date, type, amount, bank_description, bank_reference
  ) values (
    v_uid, p_wallet_id, p_entry->>'source_key', v_transaction_id, (p_entry->>'date')::date,
    p_entry->>'type', (p_entry->>'amount')::numeric, p_entry->>'description', p_entry->>'reference'
  );
  return true;
end;
$function$
;

revoke all on function public.import_bank_statement_row(uuid, jsonb) from public, anon;
grant execute on function public.import_bank_statement_row(uuid, jsonb) to authenticated, service_role;

-- A batch must fail before changing anything if any source row is ineligible.
create function public.recategorize_transactions(p_ids uuid[], p_user_category_id uuid) returns integer
language plpgsql set search_path = public as $$
declare
  v_uid uuid := require_user();
  v_category user_categories;
  v_count integer;
begin
  if coalesce(cardinality(p_ids), 0) = 0 or cardinality(p_ids) > 200 or array_position(p_ids, null) is not null then
    raise exception 'Select between 1 and 200 transactions.' using errcode = 'UC001';
  end if;
  perform 1 from transactions where user_id = v_uid and id = any(p_ids) order by id for update;
  select * into v_category from user_categories where id = p_user_category_id and user_id = v_uid for share;
  if not found then raise exception 'Category not found.' using errcode = 'UC001'; end if;
  if not v_category.is_active then raise exception 'Restore this category first.' using errcode = 'UC002'; end if;
  perform assert_not_debt_category(p_user_category_id);
  if exists (select 1 from unnest(p_ids) requested(id) where not exists (
    select 1 from transactions t left join user_categories c on c.id = t.user_category_id
    where t.id = requested.id and t.user_id = v_uid and t.type = v_category.type
      and t.transfer_pair_id is null and t.debt_payment_id is null
      and coalesce(c.system_key, '') not in ('lend_out', 'borrow_in', 'collect_debt', 'repay_debt')
  )) then
    raise exception 'The selection contains transactions that cannot take this category.' using errcode = 'UC001';
  end if;
  update transactions set user_category_id = p_user_category_id where user_id = v_uid and id = any(p_ids);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.recategorize_transactions(uuid[], uuid) from public, anon;
grant execute on function public.recategorize_transactions(uuid[], uuid) to authenticated;

-- Keep wallet locks ordered across the whole run, matching transfers and the
-- other money functions. Rules moved to another wallet wait for the next run.
create or replace function public.process_recurring_all_users() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_candidate record;
  v_peek recurring_transactions;
  v_item recurring_transactions;
  v_wallet wallets;
  v_fee numeric;
  v_total numeric;
  v_created integer := 0;
  v_rule_created integer;
begin
  for v_candidate in
    select id, wallet_id, user_id from recurring_transactions
    where active and next_run_date <= v_today
    order by wallet_id nulls first, id
  loop
    begin
      v_rule_created := 0;
      select * into v_peek from recurring_transactions where id = v_candidate.id;
      if not found then continue; end if;
      if v_peek.wallet_id is distinct from v_candidate.wallet_id or v_peek.user_id is distinct from v_candidate.user_id then continue; end if;
      if v_peek.wallet_id is not null then
        select * into v_wallet from wallets where id = v_peek.wallet_id and user_id = v_peek.user_id for update;
        if not found then raise exception 'Recurring wallet not found.'; end if;
      end if;
      select * into v_item from recurring_transactions where id = v_candidate.id for update skip locked;
      if not found or not v_item.active or v_item.next_run_date is null then continue; end if;
      -- A changed wallet must be locked in the same order on a later run.
      if v_item.wallet_id is distinct from v_peek.wallet_id or v_item.user_id is distinct from v_peek.user_id then continue; end if;
      -- Recheck after locking so a concurrent removal cannot be bypassed.
      if v_item.user_category_id is not null then
        perform 1 from user_categories where id = v_item.user_category_id and user_id = v_item.user_id
          and is_active and type = v_item.type
          and coalesce(system_key, '') not in ('lend_out', 'borrow_in', 'collect_debt', 'repay_debt') for share;
        if not found then raise exception 'Recurring category is inactive, requires a debt, or is not owned by this user.'; end if;
      end if;
      v_fee := case when v_item.bank_fee > 0 and v_item.wallet_id is not null then v_item.bank_fee else null end;
      v_total := v_item.amount + coalesce(v_fee, 0);
      while v_item.next_run_date <= v_today and (v_item.end_date is null or v_item.next_run_date <= v_item.end_date) loop
        insert into transactions(user_id, type, amount, bank_fee, user_category_id, wallet_id, transaction_date, note, is_recurring, recurring_id)
          values(v_item.user_id, v_item.type, v_total, v_fee, v_item.user_category_id, v_item.wallet_id, v_item.next_run_date, v_item.note, true, v_item.id);
        if v_item.wallet_id is not null then
          update wallets set balance = balance + case when v_item.type = 'income' then v_total else -v_total end
            where id = v_item.wallet_id and user_id = v_item.user_id;
          -- This helper uses auth.uid(); cron has no user session, so validate
          -- the locked owner's wallet explicitly instead.
          select * into v_wallet from wallets where id = v_item.wallet_id and user_id = v_item.user_id;
          if v_wallet.balance < 0 or (v_wallet.type = 'credit' and v_wallet.balance > v_wallet.credit_limit) then
            raise exception 'Recurring transaction exceeds wallet bounds.';
          end if;
        end if;
        v_rule_created := v_rule_created + 1;
        v_item.next_run_date := case v_item.frequency
          when 'daily' then (v_item.next_run_date + interval '1 day')::date
          when 'weekly' then (v_item.next_run_date + interval '7 days')::date
          when 'monthly' then (v_item.next_run_date + interval '1 month')::date
          when 'yearly' then (v_item.next_run_date + interval '1 year')::date end;
      end loop;
      update recurring_transactions set next_run_date = v_item.next_run_date where id = v_item.id;
      v_created := v_created + v_rule_created;
    exception when others then
      raise warning 'process_recurring_all_users: recurring % failed: %', v_candidate.id, sqlerrm;
    end;
  end loop;
  return v_created;
end;
$$;
-- Cross-user generator runs only as the database owner/job, never from clients.
revoke all on function public.process_recurring_all_users() from public, anon, authenticated, service_role;

-- Generated from src/lib/category-catalog.json; review and keep both in sync.
insert into public.categories(default_key, collection, type, name_vi, name_en, icon, color, search_aliases) values
  ('food_drink', 'food_drink', 'expense', 'Ăn uống', 'Food and drink', '🍽️', '#ef4444', array['an', 'uong', 'food', 'drink']),
  ('groceries', 'food_drink', 'expense', 'Đi chợ, siêu thị', 'Groceries', '🍽️', '#ef4444', array['thuc', 'pham', 'bach', 'hoa', 'supermarket']),
  ('eating_out', 'food_drink', 'expense', 'Ăn ngoài', 'Eating out', '🍽️', '#ef4444', array['nha', 'hang', 'restaurant']),
  ('breakfast', 'food_drink', 'expense', 'Ăn sáng', 'Breakfast', '🍽️', '#ef4444', array['bua', 'sang']),
  ('lunch', 'food_drink', 'expense', 'Ăn trưa', 'Lunch', '🍽️', '#ef4444', array['bua', 'trua']),
  ('dinner', 'food_drink', 'expense', 'Ăn tối', 'Dinner', '🍽️', '#ef4444', array['bua', 'toi']),
  ('coffee', 'food_drink', 'expense', 'Cà phê', 'Coffee', '🍽️', '#ef4444', array['cafe', 'ca', 'phe', 'tea', 'tra']),
  ('food_delivery', 'food_drink', 'expense', 'Đặt đồ ăn', 'Food delivery', '🍽️', '#ef4444', array['giao', 'do', 'an', 'grabfood', 'shopeefood']),
  ('transport', 'transport', 'expense', 'Di chuyển', 'Transport', '🚗', '#f97316', array['di', 'lai', 'travel']),
  ('fuel', 'transport', 'expense', 'Xăng dầu', 'Fuel', '🚗', '#f97316', array['xang', 'dau', 'petrol', 'gasoline']),
  ('parking', 'transport', 'expense', 'Gửi xe', 'Parking', '🚗', '#f97316', array['do', 'xe']),
  ('tolls', 'transport', 'expense', 'Phí cầu đường', 'Tolls', '🚗', '#f97316', array['cao', 'toc', 'cau', 'duong']),
  ('public_transport', 'transport', 'expense', 'Phương tiện công cộng', 'Public transport', '🚗', '#f97316', array['xe', 'buyt', 'bus', 'metro', 'tau']),
  ('taxi', 'transport', 'expense', 'Taxi, xe công nghệ', 'Taxis and ride hailing', '🚗', '#f97316', array['grab', 'be', 'gojek', 'taxi']),
  ('vehicle_maintenance', 'transport', 'expense', 'Bảo dưỡng xe', 'Vehicle maintenance', '🚗', '#f97316', array['sua', 'xe', 'rua', 'xe', 'service']),
  ('vehicle_insurance', 'transport', 'expense', 'Bảo hiểm xe', 'Vehicle insurance', '🚗', '#f97316', array['bao', 'hiem', 'o', 'to', 'xe', 'may']),
  ('housing', 'home', 'expense', 'Nhà ở', 'Housing', '🏠', '#06b6d4', array['nha', 'o', 'home']),
  ('rent', 'home', 'expense', 'Thuê nhà', 'Rent', '🏠', '#06b6d4', array['tien', 'thue', 'phong', 'tro']),
  ('mortgage', 'home', 'expense', 'Trả góp nhà', 'Mortgage payments', '🏠', '#06b6d4', array['vay', 'mua', 'nha', 'mortgage']),
  ('electricity', 'home', 'expense', 'Tiền điện', 'Electricity', '🏠', '#06b6d4', array['dien', 'power']),
  ('water', 'home', 'expense', 'Tiền nước', 'Water', '🏠', '#06b6d4', array['nuoc']),
  ('internet', 'home', 'expense', 'Internet', 'Internet', '🏠', '#06b6d4', array['wifi', 'mang']),
  ('phone', 'home', 'expense', 'Điện thoại', 'Phone', '🏠', '#06b6d4', array['cuoc', 'di', 'dong', 'mobile']),
  ('home_repairs', 'home', 'expense', 'Sửa chữa nhà', 'Home repairs', '🏠', '#06b6d4', array['bao', 'tri', 'nha']),
  ('household_supplies', 'home', 'expense', 'Đồ dùng gia đình', 'Household supplies', '🏠', '#06b6d4', array['gia', 'dung', 'cleaning']),
  ('bills', 'home', 'expense', 'Hóa đơn', 'Bills', '🏠', '#06b6d4', array['hoa', 'don', 'utilities']),
  ('shopping', 'shopping', 'expense', 'Mua sắm', 'Shopping', '🛍️', '#eab308', array['mua', 'sam', 'retail']),
  ('clothing', 'shopping', 'expense', 'Quần áo', 'Clothing', '🛍️', '#eab308', array['thoi', 'trang', 'fashion']),
  ('shoes', 'shopping', 'expense', 'Giày dép', 'Shoes', '🛍️', '#eab308', array['giay', 'dep', 'footwear']),
  ('electronics', 'shopping', 'expense', 'Đồ điện tử', 'Electronics', '🛍️', '#eab308', array['may', 'tinh', 'dien', 'thoai', 'laptop']),
  ('furniture', 'shopping', 'expense', 'Nội thất', 'Furniture', '🛍️', '#eab308', array['ban', 'ghe', 'giuong']),
  ('cosmetics', 'shopping', 'expense', 'Mỹ phẩm', 'Cosmetics', '🛍️', '#eab308', array['cham', 'soc', 'da', 'skincare']),
  ('haircuts', 'shopping', 'expense', 'Cắt tóc', 'Haircuts', '🛍️', '#eab308', array['lam', 'toc', 'salon']),
  ('laundry', 'shopping', 'expense', 'Giặt là', 'Laundry', '🛍️', '#eab308', array['giat', 'ui', 'dry', 'cleaning']),
  ('health', 'health', 'expense', 'Sức khỏe', 'Health', '🏥', '#ec4899', array['suc', 'khoe', 'healthcare']),
  ('medical_visits', 'health', 'expense', 'Khám bệnh', 'Medical visits', '🏥', '#ec4899', array['bac', 'si', 'vien', 'phi', 'doctor']),
  ('medicine', 'health', 'expense', 'Thuốc', 'Medicine', '🏥', '#ec4899', array['duoc', 'pham', 'pharmacy']),
  ('dental', 'health', 'expense', 'Nha khoa', 'Dental care', '🏥', '#ec4899', array['rang', 'dental']),
  ('glasses', 'health', 'expense', 'Kính mắt', 'Glasses', '🏥', '#ec4899', array['kinh', 'thuoc', 'mat', 'optical']),
  ('health_insurance', 'health', 'expense', 'Bảo hiểm sức khỏe', 'Health insurance', '🏥', '#ec4899', array['bao', 'hiem', 'y', 'te']),
  ('education', 'education', 'expense', 'Học tập', 'Education', '📚', '#3b82f6', array['hoc', 'tap', 'learning']),
  ('tuition', 'education', 'expense', 'Học phí', 'Tuition', '📚', '#3b82f6', array['truong', 'school']),
  ('books', 'education', 'expense', 'Sách', 'Books', '📚', '#3b82f6', array['sach', 'ebook']),
  ('courses', 'education', 'expense', 'Khóa học', 'Courses', '📚', '#3b82f6', array['dao', 'tao', 'online', 'course']),
  ('stationery', 'education', 'expense', 'Văn phòng phẩm', 'Stationery', '📚', '#3b82f6', array['but', 'giay', 'office', 'supplies']),
  ('work_tools', 'education', 'expense', 'Công cụ làm việc', 'Work tools', '📚', '#3b82f6', array['phan', 'mem', 'software', 'equipment']),
  ('professional_memberships', 'education', 'expense', 'Hội phí nghề nghiệp', 'Professional memberships', '📚', '#3b82f6', array['hiep', 'hoi', 'membership']),
  ('entertainment', 'entertainment', 'expense', 'Giải trí', 'Entertainment', '🎬', '#a855f7', array['giai', 'tri', 'leisure']),
  ('movies', 'entertainment', 'expense', 'Xem phim', 'Movies', '🎬', '#a855f7', array['rap', 'cinema']),
  ('games', 'entertainment', 'expense', 'Trò chơi', 'Games', '🎬', '#a855f7', array['game', 'gaming']),
  ('music', 'entertainment', 'expense', 'Âm nhạc', 'Music', '🎬', '#a855f7', array['nhac', 'spotify', 'apple', 'music']),
  ('streaming', 'entertainment', 'expense', 'Xem trực tuyến', 'Streaming', '🎬', '#a855f7', array['netflix', 'youtube', 'subscription']),
  ('hobbies', 'entertainment', 'expense', 'Sở thích', 'Hobbies', '🎬', '#a855f7', array['thu', 'vui']),
  ('gym', 'entertainment', 'expense', 'Thể thao, phòng tập', 'Gym and sports', '🎬', '#a855f7', array['tap', 'gym', 'fitness', 'yoga']),
  ('events', 'entertainment', 'expense', 'Sự kiện', 'Events', '🎬', '#a855f7', array['concert', 've', 'bieu', 'dien']),
  ('accommodation', 'travel', 'expense', 'Lưu trú', 'Accommodation', '✈️', '#0ea5e9', array['khach', 'san', 'hotel', 'homestay']),
  ('flights', 'travel', 'expense', 'Vé máy bay', 'Flights', '✈️', '#0ea5e9', array['may', 'bay', 'airline']),
  ('tours', 'travel', 'expense', 'Tour du lịch', 'Tours', '✈️', '#0ea5e9', array['tham', 'quan', 'tour']),
  ('travel_insurance', 'travel', 'expense', 'Bảo hiểm du lịch', 'Travel insurance', '✈️', '#0ea5e9', array['bao', 'hiem', 'du', 'lich']),
  ('visas', 'travel', 'expense', 'Thị thực', 'Visas', '✈️', '#0ea5e9', array['visa', 'ho', 'chieu', 'passport']),
  ('childcare', 'family_pets', 'expense', 'Chăm sóc trẻ', 'Childcare', '🐾', '#f59e0b', array['tre', 'em', 'babysitter']),
  ('school_meals', 'family_pets', 'expense', 'Ăn uống ở trường', 'School meals', '🐾', '#f59e0b', array['ban', 'tru']),
  ('family_support', 'family_pets', 'expense', 'Hỗ trợ gia đình', 'Family support', '🐾', '#f59e0b', array['bo', 'me', 'phu', 'cap']),
  ('pet_food', 'family_pets', 'expense', 'Thức ăn thú cưng', 'Pet food', '🐾', '#f59e0b', array['cho', 'meo', 'hat']),
  ('veterinary', 'family_pets', 'expense', 'Thú y', 'Veterinary care', '🐾', '#f59e0b', array['kham', 'thu', 'cung', 'vet']),
  ('birthday_gifts', 'giving', 'expense', 'Quà sinh nhật', 'Birthday gifts', '🎁', '#f43f5e', array['sinh', 'nhat', 'birthday']),
  ('wedding_gifts', 'giving', 'expense', 'Mừng cưới', 'Wedding gifts', '🎁', '#f43f5e', array['dam', 'cuoi', 'wedding']),
  ('celebrations', 'giving', 'expense', 'Lễ, Tết', 'Celebrations', '🎁', '#f43f5e', array['tet', 'le', 'li', 'xi', 'holiday']),
  ('donations', 'giving', 'expense', 'Từ thiện', 'Donations', '🎁', '#f43f5e', array['quyen', 'gop', 'charity']),
  ('bank_fees', 'fees', 'expense', 'Phí ngân hàng', 'Bank fees', '📄', '#64748b', array['phi', 'chuyen', 'tien', 'banking']),
  ('taxes', 'fees', 'expense', 'Thuế', 'Taxes', '📄', '#64748b', array['thue', 'tax']),
  ('administrative_fees', 'fees', 'expense', 'Phí hành chính', 'Administrative fees', '📄', '#64748b', array['le', 'phi', 'giay', 'to']),
  ('fines', 'fees', 'expense', 'Tiền phạt', 'Fines', '📄', '#64748b', array['vi', 'pham', 'penalty']),
  ('other_expense', 'fees', 'expense', 'Chi tiêu khác', 'Other expenses', '📄', '#64748b', array['chi', 'khac', 'miscellaneous']),
  ('salary', 'income', 'income', 'Lương', 'Salary', '💰', '#22c55e', array['luong', 'payroll', 'wages']),
  ('bonus', 'income', 'income', 'Thưởng', 'Bonus', '💰', '#22c55e', array['thuong', 'incentive']),
  ('freelance', 'income', 'income', 'Làm tự do', 'Freelance work', '💰', '#22c55e', array['freelance', 'ngoai', 'gio']),
  ('business_income', 'income', 'income', 'Kinh doanh', 'Business income', '💰', '#22c55e', array['buon', 'ban', 'doanh', 'thu']),
  ('rental_income', 'income', 'income', 'Cho thuê', 'Rental income', '💰', '#22c55e', array['tien', 'cho', 'thue']),
  ('interest', 'income', 'income', 'Tiền lãi', 'Interest', '💰', '#22c55e', array['lai', 'tiet', 'kiem', 'savings', 'interest']),
  ('dividends', 'income', 'income', 'Cổ tức', 'Dividends', '💰', '#22c55e', array['co', 'tuc', 'shares']),
  ('investment', 'income', 'income', 'Đầu tư', 'Investment income', '💰', '#22c55e', array['dau', 'tu', 'chung', 'khoan']),
  ('gifts_received', 'income', 'income', 'Quà được tặng', 'Gifts received', '💰', '#22c55e', array['qua', 'tang', 'li', 'xi', 'received']),
  ('refunds', 'income', 'income', 'Hoàn tiền', 'Refunds', '💰', '#22c55e', array['hoan', 'tien', 'return']),
  ('other_income', 'income', 'income', 'Thu nhập khác', 'Other income', '💰', '#22c55e', array['thu', 'khac', 'miscellaneous']);

-- SQL-level completion assertions precede the surrounding transaction's commit.
do $$
begin
  if (select count(*) from categories) <> 85 or exists (select 1 from user_categories) then
    raise exception 'Unexpected catalog or initial membership state.';
  end if;
  if exists (select 1 from transactions) or exists (select 1 from wallets) or exists (select 1 from budgets)
    or exists (select 1 from recurring_transactions) or exists (select 1 from debts)
    or exists (select 1 from debt_payments) or exists (select 1 from saving_goals)
    or exists (select 1 from bank_statement_imports) or exists (select 1 from ai_insights_cache)
    or exists (select 1 from net_worth_snapshots) or exists (select 1 from notification_states) then
    raise exception 'The clean-ledger postcondition failed.';
  end if;
end;
$$;
notify pgrst, 'reload schema';
