-- ============================================================
-- INITIAL SCHEMA — Personal Finance App
-- ============================================================

-- Auto-update updated_at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- WALLETS
-- ============================================================
create table wallets (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  type        text        not null check (type in ('cash', 'bank', 'e_wallet', 'investment', 'other')),
  balance     numeric(15,2) not null default 0,
  color       text,
  icon        text,
  is_default  boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger wallets_updated_at
  before update on wallets
  for each row execute function update_updated_at();

alter table wallets enable row level security;

create policy "wallets: owner full access"
  on wallets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table categories (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete cascade, -- null = system default
  name        text        not null,
  icon        text,
  color       text,
  type        text        not null check (type in ('income', 'expense')),
  parent_id   uuid        references categories(id) on delete set null,
  is_default  boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger categories_updated_at
  before update on categories
  for each row execute function update_updated_at();

alter table categories enable row level security;

-- System categories (user_id is null) are readable by everyone
create policy "categories: read system and own"
  on categories for select
  using (user_id is null or auth.uid() = user_id);

create policy "categories: insert own"
  on categories for insert
  with check (auth.uid() = user_id);

create policy "categories: update own"
  on categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "categories: delete own"
  on categories for delete
  using (auth.uid() = user_id);

-- ============================================================
-- RECURRING TRANSACTIONS (defined before transactions for FK)
-- ============================================================
create table recurring_transactions (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  wallet_id       uuid        references wallets(id) on delete set null,
  category_id     uuid        references categories(id) on delete set null,
  type            text        not null check (type in ('income', 'expense')),
  amount          numeric(15,2) not null check (amount > 0),
  note            text,
  frequency       text        not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  start_date      date        not null,
  end_date        date,
  next_run_date   date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger recurring_transactions_updated_at
  before update on recurring_transactions
  for each row execute function update_updated_at();

alter table recurring_transactions enable row level security;

create policy "recurring_transactions: owner full access"
  on recurring_transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
create table transactions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  wallet_id        uuid        references wallets(id) on delete set null,
  category_id      uuid        references categories(id) on delete set null,
  type             text        not null check (type in ('income', 'expense')),
  amount           numeric(15,2) not null check (amount > 0),
  note             text,
  transaction_date date        not null,
  payment_method   text,
  is_recurring     boolean     not null default false,
  recurring_id     uuid        references recurring_transactions(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger transactions_updated_at
  before update on transactions
  for each row execute function update_updated_at();

alter table transactions enable row level security;

create policy "transactions: owner full access"
  on transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_transactions_user_date   on transactions(user_id, transaction_date desc);
create index idx_transactions_category    on transactions(category_id);
create index idx_transactions_wallet      on transactions(wallet_id);

-- ============================================================
-- BUDGETS
-- ============================================================
create table budgets (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  category_id uuid        references categories(id) on delete cascade,
  amount      numeric(15,2) not null check (amount > 0),
  -- stored as first day of month, e.g. 2024-01-01 = January 2024
  month       date        not null check (date_trunc('month', month)::date = month),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, category_id, month)
);

create trigger budgets_updated_at
  before update on budgets
  for each row execute function update_updated_at();

alter table budgets enable row level security;

create policy "budgets: owner full access"
  on budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_budgets_user_month on budgets(user_id, month);

-- ============================================================
-- SAVING GOALS
-- ============================================================
create table saving_goals (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  name           text        not null,
  icon           text,
  target_amount  numeric(15,2) not null check (target_amount > 0),
  current_amount numeric(15,2) not null default 0 check (current_amount >= 0),
  deadline       date,
  status         text        not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger saving_goals_updated_at
  before update on saving_goals
  for each row execute function update_updated_at();

alter table saving_goals enable row level security;

create policy "saving_goals: owner full access"
  on saving_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- DEBTS
-- ============================================================
create table debts (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  wallet_id        uuid        references wallets(id) on delete set null,
  type             text        not null check (type in ('lend', 'borrow')),
  person_name      text        not null,
  person_contact   text,
  amount           numeric(15,2) not null check (amount > 0),
  remaining_amount numeric(15,2) not null check (remaining_amount >= 0),
  due_date         date,
  status           text        not null default 'active' check (status in ('active', 'completed', 'overdue')),
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger debts_updated_at
  before update on debts
  for each row execute function update_updated_at();

alter table debts enable row level security;

create policy "debts: owner full access"
  on debts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- DEBT PAYMENTS
-- ============================================================
create table debt_payments (
  id        uuid        primary key default gen_random_uuid(),
  debt_id   uuid        not null references debts(id) on delete cascade,
  amount    numeric(15,2) not null check (amount > 0),
  note      text,
  paid_at   timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table debt_payments enable row level security;

-- Access via parent debt's user_id
create policy "debt_payments: owner full access"
  on debt_payments for all
  using (
    exists (
      select 1 from debts
      where debts.id = debt_payments.debt_id
        and debts.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from debts
      where debts.id = debt_payments.debt_id
        and debts.user_id = auth.uid()
    )
  );

create index idx_debt_payments_debt_id on debt_payments(debt_id);

-- ============================================================
-- SEED: DEFAULT CATEGORIES (system-wide, user_id = null)
-- ============================================================
insert into categories (user_id, name, icon, color, type, is_default) values
  -- Income
  (null, 'Lương',         '💼', '#22c55e', 'income',  true),
  (null, 'Thưởng',        '🎁', '#16a34a', 'income',  true),
  (null, 'Đầu tư',        '📈', '#15803d', 'income',  true),
  (null, 'Thu nhập khác', '💰', '#4ade80', 'income',  true),
  -- Expense
  (null, 'Ăn uống',       '🍔', '#ef4444', 'expense', true),
  (null, 'Di chuyển',     '🚗', '#f97316', 'expense', true),
  (null, 'Mua sắm',       '🛍️', '#eab308', 'expense', true),
  (null, 'Giải trí',      '🎬', '#a855f7', 'expense', true),
  (null, 'Sức khỏe',      '🏥', '#ec4899', 'expense', true),
  (null, 'Nhà ở',         '🏠', '#06b6d4', 'expense', true),
  (null, 'Học tập',       '📚', '#3b82f6', 'expense', true),
  (null, 'Hóa đơn',       '📄', '#64748b', 'expense', true),
  (null, 'Chi tiêu khác', '💸', '#94a3b8', 'expense', true);
