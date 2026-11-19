-- Captured public schema, 19 November 2026, before membership cut-over.
-- ISOLATED EMPTY SUPABASE DATABASES ONLY. Not a production reset or data backup.
-- Requires Supabase roles and auth.users/auth.uid(); deliberately creates no cron job.
set check_function_bodies = off;

create table public."ai_insights_cache" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "cache_key" text not null,
  "result" jsonb not null,
  "created_at" timestamp with time zone default now()
);

create table public."bank_statement_imports" (
  "user_id" uuid not null,
  "wallet_id" uuid not null,
  "source_key" text not null,
  "transaction_id" uuid,
  "transaction_date" date not null,
  "type" text not null,
  "amount" numeric(15,2) not null,
  "bank_description" text not null,
  "bank_reference" text not null,
  "created_at" timestamp with time zone default now() not null
);

create table public."budgets" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "category_id" uuid,
  "amount" numeric(15,2) not null,
  "month" date not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "rollover" boolean default false not null,
  "active" boolean default true not null
);

create table public."categories" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "name" text not null,
  "icon" text,
  "color" text,
  "type" text not null,
  "parent_id" uuid,
  "is_default" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "system_key" text,
  "default_key" text,
  "name_is_custom" boolean default false not null,
  "source_template_id" uuid
);

create table public."debt_payments" (
  "id" uuid default gen_random_uuid() not null,
  "debt_id" uuid not null,
  "amount" numeric(15,2) not null,
  "note" text,
  "paid_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null,
  "type" text default 'payment'::text
);

create table public."debts" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "wallet_id" uuid,
  "type" text not null,
  "person_name" text not null,
  "person_contact" text,
  "amount" numeric(15,2) not null,
  "remaining_amount" numeric(15,2) not null,
  "due_date" date,
  "status" text default 'active'::text not null,
  "note" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table public."net_worth_snapshots" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "net_worth" numeric not null,
  "recorded_date" date default CURRENT_DATE not null
);

create table public."notification_states" (
  "user_id" uuid not null,
  "notification_id" text not null,
  "read_at" timestamp with time zone,
  "dismissed_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);

create table public."recurring_transactions" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "wallet_id" uuid,
  "category_id" uuid,
  "type" text not null,
  "amount" numeric(15,2) not null,
  "note" text,
  "frequency" text not null,
  "start_date" date not null,
  "end_date" date,
  "next_run_date" date,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "bank_fee" numeric,
  "active" boolean default true not null
);

create table public."saving_goals" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text not null,
  "icon" text,
  "target_amount" numeric(15,2) not null,
  "current_amount" numeric(15,2) default 0 not null,
  "deadline" date,
  "status" text default 'active'::text not null,
  "note" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table public."transactions" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "wallet_id" uuid,
  "category_id" uuid,
  "type" text not null,
  "amount" numeric(15,2) not null,
  "note" text,
  "transaction_date" date not null,
  "payment_method" text,
  "is_recurring" boolean default false not null,
  "recurring_id" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "transfer_pair_id" uuid,
  "debt_payment_id" uuid,
  "bank_fee" numeric
);

create table public."user_hidden_categories" (
  "user_id" uuid default auth.uid() not null,
  "category_id" uuid not null
);

create table public."wallets" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text not null,
  "type" text not null,
  "balance" numeric(15,2) default 0 not null,
  "color" text,
  "icon" text,
  "is_default" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "credit_limit" numeric,
  "statement_day" integer,
  "payment_due_day" integer
);

alter table public."wallets" add constraint "wallets_pkey" PRIMARY KEY (id);
alter table public."categories" add constraint "categories_type_check" CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])));
alter table public."categories" add constraint "categories_pkey" PRIMARY KEY (id);
alter table public."recurring_transactions" add constraint "recurring_transactions_type_check" CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])));
alter table public."recurring_transactions" add constraint "recurring_transactions_amount_check" CHECK ((amount > (0)::numeric));
alter table public."recurring_transactions" add constraint "recurring_transactions_frequency_check" CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text])));
alter table public."recurring_transactions" add constraint "recurring_transactions_pkey" PRIMARY KEY (id);
alter table public."transactions" add constraint "transactions_type_check" CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])));
alter table public."transactions" add constraint "transactions_amount_check" CHECK ((amount > (0)::numeric));
alter table public."transactions" add constraint "transactions_pkey" PRIMARY KEY (id);
alter table public."budgets" add constraint "budgets_amount_check" CHECK ((amount > (0)::numeric));
alter table public."budgets" add constraint "budgets_month_check" CHECK (((date_trunc('month'::text, (month)::timestamp with time zone))::date = month));
alter table public."budgets" add constraint "budgets_pkey" PRIMARY KEY (id);
alter table public."budgets" add constraint "budgets_user_id_category_id_month_key" UNIQUE (user_id, category_id, month);
alter table public."saving_goals" add constraint "saving_goals_target_amount_check" CHECK ((target_amount > (0)::numeric));
alter table public."saving_goals" add constraint "saving_goals_current_amount_check" CHECK ((current_amount >= (0)::numeric));
alter table public."saving_goals" add constraint "saving_goals_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])));
alter table public."saving_goals" add constraint "saving_goals_pkey" PRIMARY KEY (id);
alter table public."debts" add constraint "debts_type_check" CHECK ((type = ANY (ARRAY['lend'::text, 'borrow'::text])));
alter table public."debts" add constraint "debts_amount_check" CHECK ((amount > (0)::numeric));
alter table public."debts" add constraint "debts_remaining_amount_check" CHECK ((remaining_amount >= (0)::numeric));
alter table public."debts" add constraint "debts_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'overdue'::text])));
alter table public."debts" add constraint "debts_pkey" PRIMARY KEY (id);
alter table public."debt_payments" add constraint "debt_payments_amount_check" CHECK ((amount > (0)::numeric));
alter table public."debt_payments" add constraint "debt_payments_pkey" PRIMARY KEY (id);
alter table public."debt_payments" add constraint "debt_payments_type_check" CHECK ((type = ANY (ARRAY['payment'::text, 'addition'::text])));
alter table public."ai_insights_cache" add constraint "ai_insights_cache_pkey" PRIMARY KEY (id);
alter table public."ai_insights_cache" add constraint "ai_insights_cache_user_id_cache_key_key" UNIQUE (user_id, cache_key);
alter table public."wallets" add constraint "wallets_type_check" CHECK ((type = ANY (ARRAY['cash'::text, 'bank'::text, 'e_wallet'::text, 'investment'::text, 'other'::text, 'credit'::text])));
alter table public."wallets" add constraint "wallets_credit_limit_check" CHECK ((credit_limit > (0)::numeric));
alter table public."wallets" add constraint "wallets_statement_day_check" CHECK (((statement_day >= 1) AND (statement_day <= 31)));
alter table public."wallets" add constraint "wallets_payment_due_day_check" CHECK (((payment_due_day >= 1) AND (payment_due_day <= 31)));
alter table public."budgets" add constraint "budgets_user_category_month_unique" UNIQUE (user_id, category_id, month);
alter table public."wallets" add constraint "wallets_credit_balance_check" CHECK (((type <> 'credit'::text) OR ((credit_limit IS NOT NULL) AND (balance >= (0)::numeric) AND (balance <= credit_limit))));
alter table public."net_worth_snapshots" add constraint "net_worth_snapshots_pkey" PRIMARY KEY (id);
alter table public."net_worth_snapshots" add constraint "net_worth_snapshots_user_id_recorded_date_key" UNIQUE (user_id, recorded_date);
alter table public."recurring_transactions" add constraint "recurring_transactions_bank_fee_check" CHECK ((bank_fee >= (0)::numeric));
alter table public."notification_states" add constraint "notification_states_pkey" PRIMARY KEY (user_id, notification_id);
alter table public."transactions" add constraint "transactions_bank_fee_check" CHECK (((bank_fee IS NULL) OR (bank_fee >= (0)::numeric)));
alter table public."categories" add constraint "categories_system_key_check" CHECK (((system_key IS NULL) OR (system_key = ANY (ARRAY['lend_out'::text, 'borrow_in'::text, 'collect_debt'::text, 'repay_debt'::text, 'adjust_up'::text, 'adjust_down'::text]))));
alter table public."bank_statement_imports" add constraint "bank_statement_imports_source_key_check" CHECK ((source_key ~ '^[0-9a-f]{64}$'::text));
alter table public."bank_statement_imports" add constraint "bank_statement_imports_type_check" CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])));
alter table public."bank_statement_imports" add constraint "bank_statement_imports_amount_check" CHECK ((amount > (0)::numeric));
alter table public."bank_statement_imports" add constraint "bank_statement_imports_pkey" PRIMARY KEY (user_id, wallet_id, source_key);
alter table public."categories" add constraint "categories_default_key_check" CHECK ((default_key = ANY (ARRAY['salary'::text, 'bonus'::text, 'investment'::text, 'other_income'::text, 'food_drink'::text, 'transport'::text, 'shopping'::text, 'entertainment'::text, 'health'::text, 'housing'::text, 'education'::text, 'bills'::text, 'other_expense'::text])));
alter table public."user_hidden_categories" add constraint "user_hidden_categories_pkey" PRIMARY KEY (user_id, category_id);
alter table public."categories" add constraint "categories_source_template_personal" CHECK (((source_template_id IS NULL) OR (user_id IS NOT NULL)));
alter table public."categories" add constraint "categories_default_key_shared" CHECK (((default_key IS NULL) OR (user_id IS NULL) OR (source_template_id IS NOT NULL)));
alter table public."wallets" add constraint "wallets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."categories" add constraint "categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."categories" add constraint "categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;
alter table public."budgets" add constraint "budgets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."budgets" add constraint "budgets_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
alter table public."recurring_transactions" add constraint "recurring_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."recurring_transactions" add constraint "recurring_transactions_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE SET NULL;
alter table public."recurring_transactions" add constraint "recurring_transactions_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
alter table public."transactions" add constraint "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."transactions" add constraint "transactions_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE SET NULL;
alter table public."transactions" add constraint "transactions_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
alter table public."transactions" add constraint "transactions_recurring_id_fkey" FOREIGN KEY (recurring_id) REFERENCES recurring_transactions(id) ON DELETE SET NULL;
alter table public."saving_goals" add constraint "saving_goals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."debts" add constraint "debts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."debts" add constraint "debts_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE SET NULL;
alter table public."debt_payments" add constraint "debt_payments_debt_id_fkey" FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE;
alter table public."transactions" add constraint "transactions_debt_payment_id_fkey" FOREIGN KEY (debt_payment_id) REFERENCES debt_payments(id) ON DELETE SET NULL;
alter table public."ai_insights_cache" add constraint "ai_insights_cache_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."net_worth_snapshots" add constraint "net_worth_snapshots_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."notification_states" add constraint "notification_states_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."bank_statement_imports" add constraint "bank_statement_imports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."bank_statement_imports" add constraint "bank_statement_imports_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE;
alter table public."bank_statement_imports" add constraint "bank_statement_imports_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;
alter table public."user_hidden_categories" add constraint "user_hidden_categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."user_hidden_categories" add constraint "user_hidden_categories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
alter table public."categories" add constraint "categories_source_template_id_fkey" FOREIGN KEY (source_template_id) REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX idx_recurring_transactions_user_id ON public.recurring_transactions USING btree (user_id);
CREATE INDEX idx_recurring_transactions_wallet_id ON public.recurring_transactions USING btree (wallet_id) WHERE (wallet_id IS NOT NULL);
CREATE INDEX idx_recurring_transactions_category_id ON public.recurring_transactions USING btree (category_id) WHERE (category_id IS NOT NULL);
CREATE INDEX idx_transactions_user_date ON public.transactions USING btree (user_id, transaction_date DESC);
CREATE INDEX idx_transactions_category ON public.transactions USING btree (category_id);
CREATE INDEX idx_transactions_wallet ON public.transactions USING btree (wallet_id);
CREATE INDEX idx_transactions_user_type ON public.transactions USING btree (user_id, type);
CREATE INDEX idx_transactions_recurring_id ON public.transactions USING btree (recurring_id) WHERE (recurring_id IS NOT NULL);
CREATE INDEX idx_transactions_debt_payment_id ON public.transactions USING btree (debt_payment_id) WHERE (debt_payment_id IS NOT NULL);
CREATE INDEX idx_budgets_user_month ON public.budgets USING btree (user_id, month);
CREATE INDEX idx_budgets_category_id ON public.budgets USING btree (category_id) WHERE (category_id IS NOT NULL);
CREATE INDEX idx_saving_goals_user_id ON public.saving_goals USING btree (user_id);
CREATE INDEX idx_debts_user_id ON public.debts USING btree (user_id);
CREATE INDEX idx_debts_wallet_id ON public.debts USING btree (wallet_id) WHERE (wallet_id IS NOT NULL);
CREATE INDEX idx_debt_payments_debt_id ON public.debt_payments USING btree (debt_id);
CREATE INDEX net_worth_snapshots_user_date ON public.net_worth_snapshots USING btree (user_id, recorded_date DESC);
CREATE UNIQUE INDEX bank_statement_reference_unique ON public.bank_statement_imports USING btree (user_id, wallet_id, bank_reference) WHERE (bank_reference <> ''::text);
CREATE INDEX idx_wallets_user_id ON public.wallets USING btree (user_id);
CREATE INDEX idx_categories_user_id ON public.categories USING btree (user_id);
CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id) WHERE (parent_id IS NOT NULL);
CREATE UNIQUE INDEX categories_user_system_key_unique ON public.categories USING btree (user_id, system_key) WHERE (system_key IS NOT NULL);
CREATE UNIQUE INDEX categories_shared_default_key_unique ON public.categories USING btree (default_key) WHERE ((user_id IS NULL) AND (default_key IS NOT NULL));
CREATE UNIQUE INDEX categories_user_template_unique ON public.categories USING btree (user_id, source_template_id) WHERE (source_template_id IS NOT NULL);

CREATE OR REPLACE FUNCTION public.reject_template_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.category_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.category_id is not distinct from old.category_id then
    return new;
  end if;

  if exists (select 1 from categories where id = new.category_id and user_id is null) then
    raise exception 'Add this category from the Store before using it.' using errcode = 'P0001';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_debt(p_type text, p_person_name text, p_amount numeric, p_date date, p_person_contact text DEFAULT NULL::text, p_due_date date DEFAULT NULL::date, p_note text DEFAULT NULL::text, p_wallet_id uuid DEFAULT NULL::uuid, p_category_id uuid DEFAULT NULL::uuid)
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
$function$
;

CREATE OR REPLACE FUNCTION public.add_to_debt(p_debt_id uuid, p_amount numeric, p_date date, p_wallet_id uuid DEFAULT NULL::uuid, p_category_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text)
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
$function$
;

CREATE OR REPLACE FUNCTION public.record_debt_payment(p_debt_id uuid, p_amount numeric, p_date date, p_wallet_id uuid DEFAULT NULL::uuid, p_category_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text)
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
$function$
;

CREATE OR REPLACE FUNCTION public.delete_wallet(p_wallet_id uuid, p_date date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.clean_text(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select nullif(btrim(coalesce(p_value, '')), '');
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(p_wallet_id uuid, p_delta numeric, p_user_id uuid)
 RETURNS numeric
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  UPDATE wallets
  SET balance = balance + p_delta
  WHERE id = p_wallet_id AND user_id = p_user_id
  RETURNING balance;
$function$
;

CREATE OR REPLACE FUNCTION public.format_dong(p_amount numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select replace(to_char(trunc(p_amount), 'FM999,999,999,999'), ',', '.') || 'đ';
$function$
;

CREATE OR REPLACE FUNCTION public.insufficient_balance_message(p_wallet wallets)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case
    when p_wallet.type = 'credit'
      then p_wallet.name || ' has only ' || format_dong(p_wallet.balance) || ' of credit left.'
    else p_wallet.name || ' only has ' || format_dong(p_wallet.balance) || '.'
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.assert_wallet_in_bounds(p_wallet_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.require_user()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in.' using errcode = 'P0001';
  end if;
  return v_uid;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_transactions(p_ids uuid[])
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_uid     uuid := require_user();
  v_id      uuid;
  v_sorted  uuid[];
  v_result  json;
  v_deleted uuid[] := '{}';
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    raise exception 'Select at least one transaction to delete.' using errcode = 'P0001';
  end if;

  -- Deduplicated, and in id order so two batches overlapping on the same rows
  -- reach them in the same order. That does not order the wallet locks, which
  -- delete_transaction takes per row and holds until the batch commits: two
  -- batches crossing the same wallets in opposite order can still deadlock,
  -- and Postgres then aborts one of them whole.
  select array_agg(distinct id order by id) into v_sorted from unnest(p_ids) as id;

  foreach v_id in array v_sorted
  loop
    -- Already gone: the sibling leg of a transfer deleted earlier in this same
    -- loop. Skipping it is correct; raising "not found" would fail the batch.
    if exists (select 1 from transactions where id = v_id and user_id = v_uid) then
      v_result := delete_transaction(v_id);
      -- Its own report, not the id passed in: deleting one leg of a transfer
      -- removes two rows, and the caller's count has to say two.
      v_deleted := v_deleted || (
        select coalesce(array_agg(id::uuid), '{}')
        from json_array_elements_text(v_result->'deleted_transaction_ids') as t(id)
      );
    end if;
  end loop;

  return json_build_object('deleted_transaction_ids', to_json(v_deleted));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.process_recurring_all_users()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today    date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_item     record;
  v_run_date date;
  v_created  integer := 0;
  v_fee      numeric;
  v_total    numeric;
  v_delta    numeric;
BEGIN
  FOR v_item IN
    SELECT * FROM recurring_transactions
    WHERE active = true
      AND next_run_date IS NOT NULL
      AND next_run_date <= v_today
      AND (end_date IS NULL OR next_run_date <= end_date)
  LOOP
    BEGIN
      v_run_date := v_item.next_run_date;
      -- A fee only makes sense when it actually hits a wallet
      v_fee := CASE
        WHEN v_item.bank_fee IS NOT NULL AND v_item.bank_fee > 0 AND v_item.wallet_id IS NOT NULL
        THEN v_item.bank_fee ELSE NULL
      END;
      v_total := v_item.amount + COALESCE(v_fee, 0);

      WHILE v_run_date <= v_today
        AND (v_item.end_date IS NULL OR v_run_date <= v_item.end_date)
      LOOP
        INSERT INTO transactions (
          user_id, type, amount, bank_fee, category_id, wallet_id,
          transaction_date, note, is_recurring, recurring_id
        ) VALUES (
          v_item.user_id, v_item.type, v_total, v_fee,
          v_item.category_id, v_item.wallet_id,
          v_run_date, v_item.note, true, v_item.id
        );

        IF v_item.wallet_id IS NOT NULL THEN
          v_delta := CASE WHEN v_item.type = 'income' THEN v_total ELSE -v_total END;
          UPDATE wallets
            SET balance = balance + v_delta
            WHERE id = v_item.wallet_id
              AND user_id = v_item.user_id;
        END IF;

        v_created := v_created + 1;

        v_run_date := CASE v_item.frequency
          WHEN 'daily'   THEN (v_run_date + INTERVAL '1 day')::date
          WHEN 'weekly'  THEN (v_run_date + INTERVAL '7 days')::date
          WHEN 'monthly' THEN (v_run_date + INTERVAL '1 month')::date
          WHEN 'yearly'  THEN (v_run_date + INTERVAL '1 year')::date
          ELSE                (v_run_date + INTERVAL '1 month')::date
        END;
      END LOOP;

      UPDATE recurring_transactions
        SET next_run_date = v_run_date
        WHERE id = v_item.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'process_recurring_all_users: recurring % failed: %', v_item.id, SQLERRM;
    END;
  END LOOP;

  RETURN v_created;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_category_custom_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.name is distinct from old.name then
    new.name_is_custom := true;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assert_not_debt_category(p_category_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
begin
  if p_category_id is not null and exists (
    select 1 from categories
    where id = p_category_id
      and system_key in ('lend_out', 'borrow_in', 'collect_debt', 'repay_debt')
  ) then
    raise exception 'A debt category can only be used through a debt.' using errcode = 'DC001';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.wallet_balances_json(p_ids uuid[])
 RETURNS json
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(
    json_agg(json_build_object('id', w.id, 'balance', w.balance) order by w.id),
    '[]'::json
  )
  from wallets w
  where w.id = any(coalesce(p_ids, '{}'));
$function$
;

CREATE OR REPLACE FUNCTION public.debt_json(p_debt debts)
 RETURNS json
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case when p_debt.id is null then null else to_json(p_debt) end;
$function$
;

CREATE OR REPLACE FUNCTION public.transaction_json(p_tx transactions)
 RETURNS json
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select (to_jsonb(p_tx) || jsonb_build_object(
    'categories', (
      select jsonb_build_object('id', c.id, 'name', c.name, 'icon', c.icon, 'color', c.color)
      from categories c where c.id = p_tx.category_id
    ),
    'wallets', (
      select jsonb_build_object('id', w.id, 'name', w.name)
      from wallets w where w.id = p_tx.wallet_id
    )
  ))::json;
$function$
;

CREATE OR REPLACE FUNCTION public.create_transaction(p_type text, p_amount numeric, p_transaction_date date, p_category_id uuid DEFAULT NULL::uuid, p_wallet_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text, p_bank_fee numeric DEFAULT NULL::numeric)
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_transaction(p_id uuid, p_type text, p_amount numeric, p_transaction_date date, p_category_id uuid DEFAULT NULL::uuid, p_wallet_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text, p_bank_fee numeric DEFAULT NULL::numeric)
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
$function$
;

CREATE OR REPLACE FUNCTION public.delete_transaction(p_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
  v_tx_ids   uuid[] := '{}';
  v_pay_ids  uuid[] := '{}';
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
      v_tx_ids := v_tx_ids || v_leg.id;
    end loop;

    delete from transactions
      where transfer_pair_id = v_peek.transfer_pair_id and user_id = v_uid;

    -- Spending the transferred money already may leave the destination short.
    -- Refusing here is the honest answer; undoing it halfway is not.
    foreach v_wallet in array coalesce(v_wallets, '{}') loop
      perform assert_wallet_in_bounds(v_wallet);
    end loop;

    return json_build_object(
      'deleted_transaction_ids',  to_json(v_tx_ids),
      'deleted_debt_payment_ids', '[]'::json,
      'wallets',                  wallet_balances_json(v_wallets),
      'debt',                     null
    );
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
    v_wallets := array[v_tx.wallet_id];
  end if;

  if v_payment.id is not null then
    if v_debt.id is not null then
      -- Capped at the original debt: a payment can only give back what it took off.
      v_restored := least(v_debt.remaining_amount + v_payment.amount, v_debt.amount);
      update debts
        set remaining_amount = v_restored,
            status = case when v_debt.status = 'completed' then 'active' else v_debt.status end
        where id = v_debt.id and user_id = v_uid
        returning * into v_debt;
    end if;
    delete from debt_payments where id = v_payment.id;
    v_pay_ids := array[v_payment.id];
  end if;

  delete from transactions where id = p_id and user_id = v_uid;

  return json_build_object(
    'deleted_transaction_ids',  to_json(array[p_id]),
    'deleted_debt_payment_ids', to_json(v_pay_ids),
    'wallets',                  wallet_balances_json(v_wallets),
    'debt',                     debt_json(v_debt)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.debt_payment_json(p_payment debt_payments)
 RETURNS json
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case when p_payment.id is null then null else to_json(p_payment) end;
$function$
;

CREATE OR REPLACE FUNCTION public.import_bank_statement(p_wallet_id uuid, p_entries jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := require_user();
  v_wallet wallets;
  v_entry jsonb;
  v_imported integer := 0;
  v_skipped integer := 0;
begin
  if jsonb_typeof(p_entries) is distinct from 'array' then
    raise exception 'Choose a list of transactions to import.' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_entries) not between 1 and 500 then
    raise exception 'Import between 1 and 500 transactions at a time.' using errcode = 'P0001';
  end if;
  -- Serialize imports and other money movements for this wallet. The key check
  -- happens after the lock, so concurrent retries see the first committed batch.
  select * into v_wallet from wallets
    where id = p_wallet_id and user_id = v_uid and type = 'bank' for update;
  if not found then
    raise exception 'Choose one of your bank wallets.' using errcode = 'P0001';
  end if;
  for v_entry in select value from jsonb_array_elements(p_entries)
    order by value->>'date', value->>'type' desc, (value->>'row')::integer
  loop
    if import_bank_statement_row(p_wallet_id, v_entry) then
      v_imported := v_imported + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;
  return json_build_object(
    'imported', v_imported, 'skipped', v_skipped,
    'balance', (select balance from wallets where id = p_wallet_id and user_id = v_uid)
  );
end;
$function$
;

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
  if nullif(p_entry->>'category_id', '') is not null and not exists (
    select 1 from categories where id = (p_entry->>'category_id')::uuid
      and type = p_entry->>'type' and (user_id = v_uid or user_id is null)
      and system_key is null
  ) then
    raise exception 'Choose an income/expense category belonging to you or a shared category.' using errcode = 'P0001';
  end if;
  v_result := to_json(create_transaction(
    p_entry->>'type', (p_entry->>'amount')::numeric, (p_entry->>'date')::date,
    nullif(p_entry->>'category_id', '')::uuid, p_wallet_id, btrim(p_entry->>'title')
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

CREATE OR REPLACE FUNCTION public.transfer_funds(p_from_wallet_id uuid, p_to_wallet_id uuid, p_amount numeric, p_date date, p_note text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.pay_credit_card(p_card_wallet_id uuid, p_from_wallet_id uuid, p_amount numeric, p_date date, p_note text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.adopt_category(p_template_id uuid)
 RETURNS categories
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_uid      uuid := require_user();
  v_template categories;
  v_copy     categories;
begin
  select * into v_template from categories
    where id = p_template_id and user_id is null and default_key is not null;
  if not found then
    raise exception 'That category is not in the Store.' using errcode = 'P0001';
  end if;

  perform set_config('app.adopting_category', 'on', true);
  insert into categories (user_id, name, type, icon, color, is_default, default_key, source_template_id)
  values (v_uid, v_template.name, v_template.type, v_template.icon, v_template.color,
          false, v_template.default_key, v_template.id)
  on conflict (user_id, source_template_id) where source_template_id is not null do nothing;
  perform set_config('app.adopting_category', 'off', true);

  -- Also reached when the copy already existed, so a retry returns the same id.
  select * into v_copy from categories where user_id = v_uid and source_template_id = v_template.id;
  return v_copy;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_category_provenance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(current_setting('app.adopting_category', true), '') = 'on' or new.user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' and (new.source_template_id is not null or new.default_key is not null) then
    raise exception 'A custom category cannot claim a Store template.' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and (
    new.source_template_id is distinct from old.source_template_id
    or new.default_key is distinct from old.default_key
  ) then
    raise exception 'A category cannot change which Store template it came from.' using errcode = 'P0001';
  end if;
  return new;
end;
$function$
;
CREATE TRIGGER recurring_transactions_reject_template_category BEFORE INSERT OR UPDATE OF category_id ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION reject_template_category();
CREATE TRIGGER recurring_transactions_updated_at BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transactions_reject_template_category BEFORE INSERT OR UPDATE OF category_id ON public.transactions FOR EACH ROW EXECUTE FUNCTION reject_template_category();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER budgets_reject_template_category BEFORE INSERT OR UPDATE OF category_id ON public.budgets FOR EACH ROW EXECUTE FUNCTION reject_template_category();
CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER saving_goals_updated_at BEFORE UPDATE ON public.saving_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER debts_updated_at BEFORE UPDATE ON public.debts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER categories_custom_name BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION mark_category_custom_name();
CREATE TRIGGER categories_guard_provenance BEFORE INSERT OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION guard_category_provenance();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
alter table public."ai_insights_cache" enable row level security;
alter table public."bank_statement_imports" enable row level security;
alter table public."budgets" enable row level security;
alter table public."categories" enable row level security;
alter table public."debt_payments" enable row level security;
alter table public."debts" enable row level security;
alter table public."net_worth_snapshots" enable row level security;
alter table public."notification_states" enable row level security;
alter table public."recurring_transactions" enable row level security;
alter table public."saving_goals" enable row level security;
alter table public."transactions" enable row level security;
alter table public."user_hidden_categories" enable row level security;
alter table public."wallets" enable row level security;
create policy "wallets: owner full access" on public."wallets" as PERMISSIVE for ALL to "public" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "categories: read system and own" on public."categories" as PERMISSIVE for SELECT to "public" using (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid))));
create policy "categories: insert own" on public."categories" as PERMISSIVE for INSERT to "public" with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "categories: update own" on public."categories" as PERMISSIVE for UPDATE to "public" using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "categories: delete own" on public."categories" as PERMISSIVE for DELETE to "public" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "recurring_transactions: owner full access" on public."recurring_transactions" as PERMISSIVE for ALL to "public" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users access own cache" on public."ai_insights_cache" as PERMISSIVE for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "transactions: owner full access" on public."transactions" as PERMISSIVE for ALL to "public" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "budgets: owner full access" on public."budgets" as PERMISSIVE for ALL to "public" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "saving_goals: owner full access" on public."saving_goals" as PERMISSIVE for ALL to "public" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "debts: owner full access" on public."debts" as PERMISSIVE for ALL to "public" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "debt_payments: owner full access" on public."debt_payments" as PERMISSIVE for ALL to "public" using ((EXISTS ( SELECT 1
   FROM debts
  WHERE ((debts.id = debt_payments.debt_id) AND (debts.user_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM debts
  WHERE ((debts.id = debt_payments.debt_id) AND (debts.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Users manage own net worth snapshots" on public."net_worth_snapshots" as PERMISSIVE for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "notification_states: owner full access" on public."notification_states" as PERMISSIVE for ALL to "public" using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "bank statements: owner full access" on public."bank_statement_imports" as PERMISSIVE for ALL to "public" using ((auth.uid() = user_id)) with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM wallets w
  WHERE ((w.id = bank_statement_imports.wallet_id) AND (w.user_id = auth.uid())))) AND ((transaction_id IS NULL) OR (EXISTS ( SELECT 1
   FROM transactions t
  WHERE ((t.id = bank_statement_imports.transaction_id) AND (t.user_id = auth.uid())))))));
create policy "user_hidden_categories: read own" on public."user_hidden_categories" as PERMISSIVE for SELECT to "public" using ((auth.uid() = user_id));
create policy "user_hidden_categories: hide shared defaults" on public."user_hidden_categories" as PERMISSIVE for INSERT to "public" with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM categories c
  WHERE ((c.id = user_hidden_categories.category_id) AND (c.user_id IS NULL) AND (c.system_key IS NULL))))));
create policy "user_hidden_categories: show own" on public."user_hidden_categories" as PERMISSIVE for DELETE to "public" using ((auth.uid() = user_id));
grant INSERT on public."recurring_transactions" to "anon";
grant SELECT on public."recurring_transactions" to "anon";
grant UPDATE on public."recurring_transactions" to "anon";
grant DELETE on public."recurring_transactions" to "anon";
grant TRUNCATE on public."recurring_transactions" to "anon";
grant REFERENCES on public."recurring_transactions" to "anon";
grant TRIGGER on public."recurring_transactions" to "anon";
grant INSERT on public."recurring_transactions" to "authenticated";
grant SELECT on public."recurring_transactions" to "authenticated";
grant UPDATE on public."recurring_transactions" to "authenticated";
grant DELETE on public."recurring_transactions" to "authenticated";
grant TRUNCATE on public."recurring_transactions" to "authenticated";
grant REFERENCES on public."recurring_transactions" to "authenticated";
grant TRIGGER on public."recurring_transactions" to "authenticated";
grant INSERT on public."recurring_transactions" to "service_role";
grant SELECT on public."recurring_transactions" to "service_role";
grant UPDATE on public."recurring_transactions" to "service_role";
grant DELETE on public."recurring_transactions" to "service_role";
grant TRUNCATE on public."recurring_transactions" to "service_role";
grant REFERENCES on public."recurring_transactions" to "service_role";
grant TRIGGER on public."recurring_transactions" to "service_role";
grant INSERT on public."transactions" to "anon";
grant SELECT on public."transactions" to "anon";
grant UPDATE on public."transactions" to "anon";
grant DELETE on public."transactions" to "anon";
grant TRUNCATE on public."transactions" to "anon";
grant REFERENCES on public."transactions" to "anon";
grant TRIGGER on public."transactions" to "anon";
grant INSERT on public."transactions" to "authenticated";
grant SELECT on public."transactions" to "authenticated";
grant UPDATE on public."transactions" to "authenticated";
grant DELETE on public."transactions" to "authenticated";
grant TRUNCATE on public."transactions" to "authenticated";
grant REFERENCES on public."transactions" to "authenticated";
grant TRIGGER on public."transactions" to "authenticated";
grant INSERT on public."transactions" to "service_role";
grant SELECT on public."transactions" to "service_role";
grant UPDATE on public."transactions" to "service_role";
grant DELETE on public."transactions" to "service_role";
grant TRUNCATE on public."transactions" to "service_role";
grant REFERENCES on public."transactions" to "service_role";
grant TRIGGER on public."transactions" to "service_role";
grant INSERT on public."budgets" to "anon";
grant SELECT on public."budgets" to "anon";
grant UPDATE on public."budgets" to "anon";
grant DELETE on public."budgets" to "anon";
grant TRUNCATE on public."budgets" to "anon";
grant REFERENCES on public."budgets" to "anon";
grant TRIGGER on public."budgets" to "anon";
grant INSERT on public."budgets" to "authenticated";
grant SELECT on public."budgets" to "authenticated";
grant UPDATE on public."budgets" to "authenticated";
grant DELETE on public."budgets" to "authenticated";
grant TRUNCATE on public."budgets" to "authenticated";
grant REFERENCES on public."budgets" to "authenticated";
grant TRIGGER on public."budgets" to "authenticated";
grant INSERT on public."budgets" to "service_role";
grant SELECT on public."budgets" to "service_role";
grant UPDATE on public."budgets" to "service_role";
grant DELETE on public."budgets" to "service_role";
grant TRUNCATE on public."budgets" to "service_role";
grant REFERENCES on public."budgets" to "service_role";
grant TRIGGER on public."budgets" to "service_role";
grant INSERT on public."saving_goals" to "anon";
grant SELECT on public."saving_goals" to "anon";
grant UPDATE on public."saving_goals" to "anon";
grant DELETE on public."saving_goals" to "anon";
grant TRUNCATE on public."saving_goals" to "anon";
grant REFERENCES on public."saving_goals" to "anon";
grant TRIGGER on public."saving_goals" to "anon";
grant INSERT on public."saving_goals" to "authenticated";
grant SELECT on public."saving_goals" to "authenticated";
grant UPDATE on public."saving_goals" to "authenticated";
grant DELETE on public."saving_goals" to "authenticated";
grant TRUNCATE on public."saving_goals" to "authenticated";
grant REFERENCES on public."saving_goals" to "authenticated";
grant TRIGGER on public."saving_goals" to "authenticated";
grant INSERT on public."saving_goals" to "service_role";
grant SELECT on public."saving_goals" to "service_role";
grant UPDATE on public."saving_goals" to "service_role";
grant DELETE on public."saving_goals" to "service_role";
grant TRUNCATE on public."saving_goals" to "service_role";
grant REFERENCES on public."saving_goals" to "service_role";
grant TRIGGER on public."saving_goals" to "service_role";
grant INSERT on public."debts" to "anon";
grant SELECT on public."debts" to "anon";
grant UPDATE on public."debts" to "anon";
grant DELETE on public."debts" to "anon";
grant TRUNCATE on public."debts" to "anon";
grant REFERENCES on public."debts" to "anon";
grant TRIGGER on public."debts" to "anon";
grant INSERT on public."debts" to "authenticated";
grant SELECT on public."debts" to "authenticated";
grant UPDATE on public."debts" to "authenticated";
grant DELETE on public."debts" to "authenticated";
grant TRUNCATE on public."debts" to "authenticated";
grant REFERENCES on public."debts" to "authenticated";
grant TRIGGER on public."debts" to "authenticated";
grant INSERT on public."debts" to "service_role";
grant SELECT on public."debts" to "service_role";
grant UPDATE on public."debts" to "service_role";
grant DELETE on public."debts" to "service_role";
grant TRUNCATE on public."debts" to "service_role";
grant REFERENCES on public."debts" to "service_role";
grant TRIGGER on public."debts" to "service_role";
grant INSERT on public."debt_payments" to "anon";
grant SELECT on public."debt_payments" to "anon";
grant UPDATE on public."debt_payments" to "anon";
grant DELETE on public."debt_payments" to "anon";
grant TRUNCATE on public."debt_payments" to "anon";
grant REFERENCES on public."debt_payments" to "anon";
grant TRIGGER on public."debt_payments" to "anon";
grant INSERT on public."debt_payments" to "authenticated";
grant SELECT on public."debt_payments" to "authenticated";
grant UPDATE on public."debt_payments" to "authenticated";
grant DELETE on public."debt_payments" to "authenticated";
grant TRUNCATE on public."debt_payments" to "authenticated";
grant REFERENCES on public."debt_payments" to "authenticated";
grant TRIGGER on public."debt_payments" to "authenticated";
grant INSERT on public."debt_payments" to "service_role";
grant SELECT on public."debt_payments" to "service_role";
grant UPDATE on public."debt_payments" to "service_role";
grant DELETE on public."debt_payments" to "service_role";
grant TRUNCATE on public."debt_payments" to "service_role";
grant REFERENCES on public."debt_payments" to "service_role";
grant TRIGGER on public."debt_payments" to "service_role";
grant INSERT on public."net_worth_snapshots" to "anon";
grant SELECT on public."net_worth_snapshots" to "anon";
grant UPDATE on public."net_worth_snapshots" to "anon";
grant DELETE on public."net_worth_snapshots" to "anon";
grant TRUNCATE on public."net_worth_snapshots" to "anon";
grant REFERENCES on public."net_worth_snapshots" to "anon";
grant TRIGGER on public."net_worth_snapshots" to "anon";
grant INSERT on public."net_worth_snapshots" to "authenticated";
grant SELECT on public."net_worth_snapshots" to "authenticated";
grant UPDATE on public."net_worth_snapshots" to "authenticated";
grant DELETE on public."net_worth_snapshots" to "authenticated";
grant TRUNCATE on public."net_worth_snapshots" to "authenticated";
grant REFERENCES on public."net_worth_snapshots" to "authenticated";
grant TRIGGER on public."net_worth_snapshots" to "authenticated";
grant INSERT on public."net_worth_snapshots" to "service_role";
grant SELECT on public."net_worth_snapshots" to "service_role";
grant UPDATE on public."net_worth_snapshots" to "service_role";
grant DELETE on public."net_worth_snapshots" to "service_role";
grant TRUNCATE on public."net_worth_snapshots" to "service_role";
grant REFERENCES on public."net_worth_snapshots" to "service_role";
grant TRIGGER on public."net_worth_snapshots" to "service_role";
grant INSERT on public."notification_states" to "anon";
grant SELECT on public."notification_states" to "anon";
grant UPDATE on public."notification_states" to "anon";
grant DELETE on public."notification_states" to "anon";
grant TRUNCATE on public."notification_states" to "anon";
grant REFERENCES on public."notification_states" to "anon";
grant TRIGGER on public."notification_states" to "anon";
grant INSERT on public."notification_states" to "authenticated";
grant SELECT on public."notification_states" to "authenticated";
grant UPDATE on public."notification_states" to "authenticated";
grant DELETE on public."notification_states" to "authenticated";
grant TRUNCATE on public."notification_states" to "authenticated";
grant REFERENCES on public."notification_states" to "authenticated";
grant TRIGGER on public."notification_states" to "authenticated";
grant INSERT on public."notification_states" to "service_role";
grant SELECT on public."notification_states" to "service_role";
grant UPDATE on public."notification_states" to "service_role";
grant DELETE on public."notification_states" to "service_role";
grant TRUNCATE on public."notification_states" to "service_role";
grant REFERENCES on public."notification_states" to "service_role";
grant TRIGGER on public."notification_states" to "service_role";
grant INSERT on public."ai_insights_cache" to "anon";
grant SELECT on public."ai_insights_cache" to "anon";
grant UPDATE on public."ai_insights_cache" to "anon";
grant DELETE on public."ai_insights_cache" to "anon";
grant TRUNCATE on public."ai_insights_cache" to "anon";
grant REFERENCES on public."ai_insights_cache" to "anon";
grant TRIGGER on public."ai_insights_cache" to "anon";
grant INSERT on public."ai_insights_cache" to "authenticated";
grant SELECT on public."ai_insights_cache" to "authenticated";
grant UPDATE on public."ai_insights_cache" to "authenticated";
grant DELETE on public."ai_insights_cache" to "authenticated";
grant TRUNCATE on public."ai_insights_cache" to "authenticated";
grant REFERENCES on public."ai_insights_cache" to "authenticated";
grant TRIGGER on public."ai_insights_cache" to "authenticated";
grant INSERT on public."ai_insights_cache" to "service_role";
grant SELECT on public."ai_insights_cache" to "service_role";
grant UPDATE on public."ai_insights_cache" to "service_role";
grant DELETE on public."ai_insights_cache" to "service_role";
grant TRUNCATE on public."ai_insights_cache" to "service_role";
grant REFERENCES on public."ai_insights_cache" to "service_role";
grant TRIGGER on public."ai_insights_cache" to "service_role";
grant INSERT on public."bank_statement_imports" to "anon";
grant SELECT on public."bank_statement_imports" to "anon";
grant UPDATE on public."bank_statement_imports" to "anon";
grant DELETE on public."bank_statement_imports" to "anon";
grant TRUNCATE on public."bank_statement_imports" to "anon";
grant REFERENCES on public."bank_statement_imports" to "anon";
grant TRIGGER on public."bank_statement_imports" to "anon";
grant INSERT on public."bank_statement_imports" to "authenticated";
grant SELECT on public."bank_statement_imports" to "authenticated";
grant UPDATE on public."bank_statement_imports" to "authenticated";
grant DELETE on public."bank_statement_imports" to "authenticated";
grant TRUNCATE on public."bank_statement_imports" to "authenticated";
grant REFERENCES on public."bank_statement_imports" to "authenticated";
grant TRIGGER on public."bank_statement_imports" to "authenticated";
grant INSERT on public."bank_statement_imports" to "service_role";
grant SELECT on public."bank_statement_imports" to "service_role";
grant UPDATE on public."bank_statement_imports" to "service_role";
grant DELETE on public."bank_statement_imports" to "service_role";
grant TRUNCATE on public."bank_statement_imports" to "service_role";
grant REFERENCES on public."bank_statement_imports" to "service_role";
grant TRIGGER on public."bank_statement_imports" to "service_role";
grant INSERT on public."wallets" to "anon";
grant SELECT on public."wallets" to "anon";
grant UPDATE on public."wallets" to "anon";
grant DELETE on public."wallets" to "anon";
grant TRUNCATE on public."wallets" to "anon";
grant REFERENCES on public."wallets" to "anon";
grant TRIGGER on public."wallets" to "anon";
grant INSERT on public."wallets" to "authenticated";
grant SELECT on public."wallets" to "authenticated";
grant UPDATE on public."wallets" to "authenticated";
grant DELETE on public."wallets" to "authenticated";
grant TRUNCATE on public."wallets" to "authenticated";
grant REFERENCES on public."wallets" to "authenticated";
grant TRIGGER on public."wallets" to "authenticated";
grant INSERT on public."wallets" to "service_role";
grant SELECT on public."wallets" to "service_role";
grant UPDATE on public."wallets" to "service_role";
grant DELETE on public."wallets" to "service_role";
grant TRUNCATE on public."wallets" to "service_role";
grant REFERENCES on public."wallets" to "service_role";
grant TRIGGER on public."wallets" to "service_role";
grant INSERT on public."user_hidden_categories" to "anon";
grant SELECT on public."user_hidden_categories" to "anon";
grant UPDATE on public."user_hidden_categories" to "anon";
grant DELETE on public."user_hidden_categories" to "anon";
grant TRUNCATE on public."user_hidden_categories" to "anon";
grant REFERENCES on public."user_hidden_categories" to "anon";
grant TRIGGER on public."user_hidden_categories" to "anon";
grant INSERT on public."user_hidden_categories" to "authenticated";
grant SELECT on public."user_hidden_categories" to "authenticated";
grant UPDATE on public."user_hidden_categories" to "authenticated";
grant DELETE on public."user_hidden_categories" to "authenticated";
grant TRUNCATE on public."user_hidden_categories" to "authenticated";
grant REFERENCES on public."user_hidden_categories" to "authenticated";
grant TRIGGER on public."user_hidden_categories" to "authenticated";
grant INSERT on public."user_hidden_categories" to "service_role";
grant SELECT on public."user_hidden_categories" to "service_role";
grant UPDATE on public."user_hidden_categories" to "service_role";
grant DELETE on public."user_hidden_categories" to "service_role";
grant TRUNCATE on public."user_hidden_categories" to "service_role";
grant REFERENCES on public."user_hidden_categories" to "service_role";
grant TRIGGER on public."user_hidden_categories" to "service_role";
grant INSERT on public."categories" to "anon";
grant SELECT on public."categories" to "anon";
grant UPDATE on public."categories" to "anon";
grant DELETE on public."categories" to "anon";
grant TRUNCATE on public."categories" to "anon";
grant REFERENCES on public."categories" to "anon";
grant TRIGGER on public."categories" to "anon";
grant INSERT on public."categories" to "authenticated";
grant SELECT on public."categories" to "authenticated";
grant UPDATE on public."categories" to "authenticated";
grant DELETE on public."categories" to "authenticated";
grant TRUNCATE on public."categories" to "authenticated";
grant REFERENCES on public."categories" to "authenticated";
grant TRIGGER on public."categories" to "authenticated";
grant INSERT on public."categories" to "service_role";
grant SELECT on public."categories" to "service_role";
grant UPDATE on public."categories" to "service_role";
grant DELETE on public."categories" to "service_role";
grant TRUNCATE on public."categories" to "service_role";
grant REFERENCES on public."categories" to "service_role";
grant TRIGGER on public."categories" to "service_role";
revoke all on function public.reject_template_category() from public, anon, authenticated;
grant execute on function public.reject_template_category() to authenticated;
grant execute on function public.reject_template_category() to service_role;
revoke all on function public.create_debt(text, text, numeric, date, text, date, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_debt(text, text, numeric, date, text, date, text, uuid, uuid) to authenticated;
grant execute on function public.create_debt(text, text, numeric, date, text, date, text, uuid, uuid) to service_role;
revoke all on function public.add_to_debt(uuid, numeric, date, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.add_to_debt(uuid, numeric, date, uuid, uuid, text) to authenticated;
grant execute on function public.add_to_debt(uuid, numeric, date, uuid, uuid, text) to service_role;
revoke all on function public.record_debt_payment(uuid, numeric, date, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.record_debt_payment(uuid, numeric, date, uuid, uuid, text) to authenticated;
grant execute on function public.record_debt_payment(uuid, numeric, date, uuid, uuid, text) to service_role;
revoke all on function public.delete_wallet(uuid, date) from public, anon, authenticated;
grant execute on function public.delete_wallet(uuid, date) to authenticated;
grant execute on function public.delete_wallet(uuid, date) to service_role;
revoke all on function public.reconcile_wallet(uuid, numeric, date, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reconcile_wallet(uuid, numeric, date, uuid, uuid, text) to authenticated;
grant execute on function public.reconcile_wallet(uuid, numeric, date, uuid, uuid, text) to service_role;
revoke all on function public.clean_text(text) from public, anon, authenticated;
grant execute on function public.clean_text(text) to authenticated;
grant execute on function public.clean_text(text) to service_role;
revoke all on function public.update_updated_at() from public, anon, authenticated;
grant execute on function public.update_updated_at() to authenticated;
grant execute on function public.update_updated_at() to service_role;
revoke all on function public.adjust_wallet_balance(uuid, numeric, uuid) from public, anon, authenticated;
grant execute on function public.adjust_wallet_balance(uuid, numeric, uuid) to authenticated;
grant execute on function public.adjust_wallet_balance(uuid, numeric, uuid) to service_role;
revoke all on function public.format_dong(numeric) from public, anon, authenticated;
grant execute on function public.format_dong(numeric) to authenticated;
grant execute on function public.format_dong(numeric) to service_role;
revoke all on function public.insufficient_balance_message(wallets) from public, anon, authenticated;
grant execute on function public.insufficient_balance_message(wallets) to authenticated;
grant execute on function public.insufficient_balance_message(wallets) to service_role;
revoke all on function public.assert_wallet_in_bounds(uuid) from public, anon, authenticated;
grant execute on function public.assert_wallet_in_bounds(uuid) to authenticated;
grant execute on function public.assert_wallet_in_bounds(uuid) to service_role;
revoke all on function public.require_user() from public, anon, authenticated;
grant execute on function public.require_user() to authenticated;
grant execute on function public.require_user() to service_role;
revoke all on function public.delete_transactions(uuid[]) from public, anon, authenticated;
grant execute on function public.delete_transactions(uuid[]) to authenticated;
grant execute on function public.delete_transactions(uuid[]) to service_role;
revoke all on function public.process_recurring_all_users() from public, anon, authenticated;
grant execute on function public.process_recurring_all_users() to service_role;
revoke all on function public.mark_category_custom_name() from public, anon, authenticated;
grant execute on function public.mark_category_custom_name() to authenticated;
grant execute on function public.mark_category_custom_name() to service_role;
revoke all on function public.assert_not_debt_category(uuid) from public, anon, authenticated;
grant execute on function public.assert_not_debt_category(uuid) to authenticated;
grant execute on function public.assert_not_debt_category(uuid) to service_role;
revoke all on function public.wallet_balances_json(uuid[]) from public, anon, authenticated;
grant execute on function public.wallet_balances_json(uuid[]) to authenticated;
grant execute on function public.wallet_balances_json(uuid[]) to service_role;
revoke all on function public.debt_json(debts) from public, anon, authenticated;
grant execute on function public.debt_json(debts) to authenticated;
grant execute on function public.debt_json(debts) to service_role;
revoke all on function public.transaction_json(transactions) from public, anon, authenticated;
grant execute on function public.transaction_json(transactions) to authenticated;
grant execute on function public.transaction_json(transactions) to service_role;
revoke all on function public.create_transaction(text, numeric, date, uuid, uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.create_transaction(text, numeric, date, uuid, uuid, text, numeric) to authenticated;
grant execute on function public.create_transaction(text, numeric, date, uuid, uuid, text, numeric) to service_role;
revoke all on function public.update_transaction(uuid, text, numeric, date, uuid, uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.update_transaction(uuid, text, numeric, date, uuid, uuid, text, numeric) to authenticated;
grant execute on function public.update_transaction(uuid, text, numeric, date, uuid, uuid, text, numeric) to service_role;
revoke all on function public.delete_transaction(uuid) from public, anon, authenticated;
grant execute on function public.delete_transaction(uuid) to authenticated;
grant execute on function public.delete_transaction(uuid) to service_role;
revoke all on function public.debt_payment_json(debt_payments) from public, anon, authenticated;
grant execute on function public.debt_payment_json(debt_payments) to authenticated;
grant execute on function public.debt_payment_json(debt_payments) to service_role;
revoke all on function public.import_bank_statement(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_bank_statement(uuid, jsonb) to authenticated;
grant execute on function public.import_bank_statement(uuid, jsonb) to service_role;
revoke all on function public.import_bank_statement_row(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.import_bank_statement_row(uuid, jsonb) to authenticated;
grant execute on function public.import_bank_statement_row(uuid, jsonb) to service_role;
revoke all on function public.transfer_funds(uuid, uuid, numeric, date, text) from public, anon, authenticated;
grant execute on function public.transfer_funds(uuid, uuid, numeric, date, text) to authenticated;
grant execute on function public.transfer_funds(uuid, uuid, numeric, date, text) to service_role;
revoke all on function public.pay_credit_card(uuid, uuid, numeric, date, text) from public, anon, authenticated;
grant execute on function public.pay_credit_card(uuid, uuid, numeric, date, text) to authenticated;
grant execute on function public.pay_credit_card(uuid, uuid, numeric, date, text) to service_role;
revoke all on function public.adopt_category(uuid) from public, anon, authenticated;
grant execute on function public.adopt_category(uuid) to authenticated;
grant execute on function public.adopt_category(uuid) to service_role;
revoke all on function public.guard_category_provenance() from public, anon, authenticated;
grant execute on function public.guard_category_provenance() to authenticated;
grant execute on function public.guard_category_provenance() to service_role;
set check_function_bodies = on;

