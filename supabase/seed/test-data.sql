-- =============================================================================
-- Repeatable fixtures for test@gmail.com, for initial setup or later refreshes.
-- Each run replaces this account's financial data, preserving Auth, catalog
-- templates, and every other user's data. An empty account needs no reset step.
-- Requires the new categories -> user_categories -> financial-record schema.
-- Run the reviewed script as postgres in SQL Editor, with test-account writers
-- and recurring generation stopped. All changes commit together or roll back.
-- Dates cover the current month through today and the two preceding months in
-- Asia/Ho_Chi_Minh. Wallet balances and net worth are derived from the ledger.
-- This is not a migration and does not create or modify catalog templates.
-- =============================================================================
BEGIN;
SET LOCAL search_path = public;
SET LOCAL lock_timeout = '5s';

DO $seed$
DECLARE
  test_email constant text := 'test@gmail.com';
  test_user_id uuid;
  today date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  current_month date := date_trunc('month', today)::date;
  first_month date := (current_month - interval '2 months')::date;
  previous_month date := (current_month - interval '1 month')::date;
  fixture_month date;
  wallet_cash uuid := gen_random_uuid();
  wallet_bank uuid := gen_random_uuid();
  wallet_momo uuid := gen_random_uuid();
  wallet_credit uuid := gen_random_uuid();
  custom_hobby uuid := gen_random_uuid();
  removed_category uuid;
  debt_minh uuid := gen_random_uuid();
  debt_lan uuid := gen_random_uuid();
  debt_hung uuid := gen_random_uuid();
  minh_addition uuid := gen_random_uuid();
  minh_payment uuid := gen_random_uuid();
  lan_payment uuid := gen_random_uuid();
  hung_payment uuid := gen_random_uuid();
  cash_transfer uuid := gen_random_uuid();
  card_payment uuid := gen_random_uuid();
  template_ids uuid[];
  system_key text;
  required_keys constant text[] := ARRAY[
    'salary', 'bonus', 'investment', 'other_income', 'food_drink', 'coffee',
    'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'housing', 'movies'
  ];
BEGIN
  SELECT id INTO test_user_id FROM auth.users WHERE email = test_email;
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Seed account % does not exist. Create the account before running this script.', test_email;
  END IF;

  -- Check prerequisites before changing any existing fixture data.
  IF to_regclass('public.user_categories') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'user_category_id'
     )
     OR NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'budgets' AND column_name = 'user_category_id'
     )
     OR NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'recurring_transactions' AND column_name = 'user_category_id'
     )
     OR to_regprocedure('public.adopt_categories(uuid[])') IS NULL
     OR to_regprocedure('public.ensure_system_category(text)') IS NULL THEN
    RAISE EXCEPTION 'Seed requires the user_categories rebuild, user_category_id columns, adopt_categories(uuid[]), and ensure_system_category(text). Apply the reviewed schema first; no rows were changed.';
  END IF;

  SELECT array_agg(id ORDER BY default_key) INTO template_ids
  FROM categories WHERE default_key = ANY(required_keys) AND is_available;
  IF coalesce(cardinality(template_ids), 0) <> cardinality(required_keys) THEN
    RAISE EXCEPTION 'Seed catalog is incomplete. Enable all required template keys before running; no rows were changed.';
  END IF;

  -- Existing RPCs resolve the fixture owner through auth.uid(). No Auth row changes.
  PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id, 'role', 'authenticated')::text, true);

  -- Dependency order matters: remove referencing records before their parents.
  -- These statements affect zero rows on the first run against an empty account.
  DELETE FROM bank_statement_imports WHERE user_id = test_user_id;
  DELETE FROM transactions WHERE user_id = test_user_id;
  DELETE FROM debt_payments WHERE debt_id IN (SELECT id FROM debts WHERE user_id = test_user_id);
  DELETE FROM debts WHERE user_id = test_user_id;
  DELETE FROM budgets WHERE user_id = test_user_id;
  DELETE FROM recurring_transactions WHERE user_id = test_user_id;
  DELETE FROM saving_goals WHERE user_id = test_user_id;
  DELETE FROM net_worth_snapshots WHERE user_id = test_user_id;
  DELETE FROM ai_insights_cache WHERE user_id = test_user_id;
  DELETE FROM notification_states WHERE user_id = test_user_id;
  DELETE FROM user_categories WHERE user_id = test_user_id;
  DELETE FROM wallets WHERE user_id = test_user_id;

  CREATE TEMPORARY TABLE seed_opening_balances (
    wallet_id uuid PRIMARY KEY,
    opening_balance numeric NOT NULL
  ) ON COMMIT DROP;
  INSERT INTO seed_opening_balances VALUES
    (wallet_cash, 20000000), (wallet_bank, 30000000),
    (wallet_momo, 5000000), (wallet_credit, 30000000);

  INSERT INTO wallets (id, user_id, name, type, balance, icon, color, is_default) VALUES
    (wallet_cash, test_user_id, 'Tiền mặt', 'cash', 20000000, '💵', '#10b981', true),
    (wallet_bank, test_user_id, 'Vietcombank', 'bank', 30000000, '🏦', '#3b82f6', false),
    (wallet_momo, test_user_id, 'MoMo', 'e_wallet', 5000000, '📱', '#d946ef', false);
  INSERT INTO wallets (id, user_id, name, type, balance, icon, color, credit_limit, statement_day, payment_due_day)
  VALUES (wallet_credit, test_user_id, 'VPBank Credit', 'credit', 30000000, '💳', '#8b5cf6', 30000000, 25, 10);

  -- Use the real adoption/provisioning paths rather than forging provenance.
  PERFORM adopt_categories(template_ids);
  CREATE TEMPORARY TABLE seed_categories (key text PRIMARY KEY, id uuid NOT NULL UNIQUE) ON COMMIT DROP;
  INSERT INTO seed_categories
  SELECT t.default_key, c.id FROM user_categories c
  JOIN categories t ON t.id = c.category_id
  WHERE c.user_id = test_user_id AND t.default_key = ANY(required_keys);
  IF (SELECT count(*) FROM seed_categories) <> cardinality(required_keys) THEN
    RAISE EXCEPTION 'Category adoption did not return all required fixture categories.';
  END IF;

  FOREACH system_key IN ARRAY ARRAY['lend_out', 'borrow_in', 'collect_debt', 'repay_debt', 'adjust_up', 'adjust_down']
  LOOP
    INSERT INTO seed_categories VALUES (system_key, ensure_system_category(system_key));
  END LOOP;
  INSERT INTO user_categories (id, user_id, name, type, icon, color) VALUES
    (custom_hobby, test_user_id, 'Sở thích cá nhân', 'expense', '🎸', '#a855f7');
  INSERT INTO seed_categories VALUES ('custom_hobby', custom_hobby);
  SELECT id INTO STRICT removed_category FROM seed_categories WHERE key = 'movies';
  UPDATE user_categories SET name = 'Cà phê cuối tuần'
  WHERE user_id = test_user_id AND id = (SELECT id FROM seed_categories WHERE key = 'coffee');

  -- Predictable daily activity through today, with no future transactions.
  INSERT INTO transactions (user_id, wallet_id, user_category_id, type, amount, note, transaction_date)
  SELECT test_user_id, wallet_cash, c.id, 'expense',
         45000 + (extract(day FROM day)::integer % 7) * 10000,
         'Ăn uống hằng ngày', day::date
  FROM generate_series(first_month::timestamp, today::timestamp, interval '1 day') day
  CROSS JOIN seed_categories c WHERE c.key = 'food_drink';
  INSERT INTO transactions (user_id, wallet_id, user_category_id, type, amount, note, transaction_date)
  SELECT test_user_id, wallet_momo, c.id, 'expense', 45000, 'Cà phê cùng bạn', day::date
  FROM generate_series(first_month::timestamp, today::timestamp, interval '3 days') day
  CROSS JOIN seed_categories c WHERE c.key = 'coffee';
  INSERT INTO transactions (user_id, wallet_id, user_category_id, type, amount, note, transaction_date)
  SELECT test_user_id, wallet_momo, c.id, 'expense', 85000, 'Xe công nghệ đi làm', day::date
  FROM generate_series(first_month::timestamp, today::timestamp, interval '5 days') day
  CROSS JOIN seed_categories c WHERE c.key = 'transport';

  FOR fixture_month IN SELECT month::date FROM generate_series(first_month::timestamp, current_month::timestamp, interval '1 month') month
  LOOP
    INSERT INTO transactions (user_id, wallet_id, user_category_id, type, amount, note, transaction_date)
    SELECT test_user_id, f.wallet_id, c.id, f.type, f.amount, f.note, least(f.date, today)
    FROM (VALUES
      (wallet_bank, 'salary', 'income', 25000000, 'Lương tháng', fixture_month + 4),
      (wallet_bank, 'housing', 'expense', 6000000, 'Tiền nhà', fixture_month),
      (wallet_bank, 'bills', 'expense', 380000, 'Tiền điện', fixture_month + 1),
      (wallet_bank, 'bills', 'expense', 200000, 'Internet', fixture_month + 2),
      (wallet_credit, 'shopping', 'expense', 1290000, 'Mua sắm cá nhân', fixture_month + 6),
      (wallet_credit, 'entertainment', 'expense', 260000, 'Đăng ký xem phim', fixture_month + 9),
      (wallet_bank, 'education', 'expense', 1200000, 'Khóa học ngoại ngữ', fixture_month + 12),
      (wallet_bank, 'health', 'expense', 850000, 'Khám sức khỏe', fixture_month + 13)
    ) f(wallet_id, category_key, type, amount, note, date)
    JOIN seed_categories c ON c.key = f.category_key;
  END LOOP;

  INSERT INTO transactions (user_id, wallet_id, user_category_id, type, amount, note, transaction_date)
  SELECT test_user_id, f.wallet_id, c.id, f.type, f.amount, f.note, f.date
  FROM (VALUES
    (wallet_bank, 'bonus', 'income', 3000000, 'Thưởng dự án', previous_month + 11),
    (wallet_bank, 'investment', 'income', 1150000, 'Cổ tức', previous_month + 20),
    (wallet_cash, 'other_income', 'income', 800000, 'Bán đồ cũ', first_month + 19),
    (wallet_momo, 'custom_hobby', 'expense', 430000, 'Dây đàn và phụ kiện', previous_month + 20),
    (wallet_credit, 'movies', 'expense', 250000, 'Xem phim cùng bạn', first_month + 7),
    (wallet_credit, 'shopping', 'expense', 3500000, 'Mua điện thoại', least(current_month + 6, today))
  ) f(wallet_id, category_key, type, amount, note, date)
  JOIN seed_categories c ON c.key = f.category_key;
  INSERT INTO transactions (user_id, wallet_id, type, amount, note, transaction_date)
  VALUES (test_user_id, wallet_cash, 'expense', 100000, 'Khoản chi chưa phân loại', today);
  INSERT INTO transactions (user_id, wallet_id, user_category_id, type, amount, bank_fee, note, transaction_date)
  SELECT test_user_id, wallet_bank, id, 'expense', 125000, 5000, 'Đi lại kèm phí ngân hàng', today
  FROM seed_categories WHERE key = 'transport';

  -- Both legs share an identity; credit balance represents available credit.
  INSERT INTO transactions (user_id, wallet_id, type, amount, note, transaction_date, transfer_pair_id) VALUES
    (test_user_id, wallet_bank, 'expense', 1000000, 'Rút tiền mặt', today, cash_transfer),
    (test_user_id, wallet_cash, 'income', 1000000, 'Rút tiền mặt', today, cash_transfer),
    (test_user_id, wallet_bank, 'expense', 2000000, 'Thanh toán thẻ tín dụng', today, card_payment),
    (test_user_id, wallet_credit, 'income', 2000000, 'Thanh toán thẻ tín dụng', today, card_payment);

  -- Opening principal follows the debt RPC convention; payments/additions carry
  -- debt_payment_id so editing or deleting them can update the related debt.
  INSERT INTO debts (id, user_id, wallet_id, type, person_name, amount, remaining_amount, due_date, status, note, created_at) VALUES
    (debt_minh, test_user_id, wallet_bank, 'lend', 'Minh (test)', 6000000, 3000000,
      (current_month + interval '1 month')::date + 14, 'active', 'Đã cho vay thêm và thu một phần', first_month + 3),
    (debt_lan, test_user_id, wallet_bank, 'borrow', 'Lan (test)', 10000000, 8000000,
      today - 3, 'active', 'Khoản vay quá hạn để kiểm tra cảnh báo', first_month + 17),
    (debt_hung, test_user_id, wallet_cash, 'lend', 'Hùng (test)', 2000000, 0,
      previous_month + 14, 'completed', 'Đã thu đủ', first_month + 9);
  INSERT INTO debt_payments (id, debt_id, amount, note, paid_at, type) VALUES
    (minh_addition, debt_minh, 1000000, 'Cho vay thêm', (previous_month + 5)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh', 'addition'),
    (minh_payment, debt_minh, 3000000, 'Thu một phần', (previous_month + 19)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh', 'payment'),
    (lan_payment, debt_lan, 2000000, 'Trả một phần', least(current_month + 2, today)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh', 'payment'),
    (hung_payment, debt_hung, 2000000, 'Thu đủ', (previous_month + 7)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh', 'payment');
  INSERT INTO transactions (user_id, wallet_id, user_category_id, type, amount, note, transaction_date, debt_payment_id)
  SELECT test_user_id, f.wallet_id, c.id, f.type, f.amount, f.note, f.date, f.payment_id
  FROM (VALUES
    (wallet_bank, 'lend_out', 'expense', 5000000, 'Cho Minh vay', first_month + 3, NULL::uuid),
    (wallet_bank, 'borrow_in', 'income', 10000000, 'Vay Lan', first_month + 17, NULL::uuid),
    (wallet_cash, 'lend_out', 'expense', 2000000, 'Cho Hùng vay', first_month + 9, NULL::uuid),
    (wallet_bank, 'lend_out', 'expense', 1000000, 'Cho Minh vay thêm', previous_month + 5, minh_addition),
    (wallet_bank, 'collect_debt', 'income', 3000000, 'Minh trả nợ', previous_month + 19, minh_payment),
    (wallet_bank, 'repay_debt', 'expense', 2000000, 'Trả nợ Lan', least(current_month + 2, today), lan_payment),
    (wallet_cash, 'collect_debt', 'income', 2000000, 'Hùng trả đủ', previous_month + 7, hung_payment)
  ) f(wallet_id, category_key, type, amount, note, date, payment_id)
  JOIN seed_categories c ON c.key = f.category_key;

  -- The same user-category IDs drive spending and rollover across all months.
  INSERT INTO budgets (user_id, user_category_id, amount, month, rollover, active)
  SELECT test_user_id, c.id, f.amount, month::date, f.rollover, true
  FROM generate_series(first_month::timestamp, current_month::timestamp, interval '1 month') month
  CROSS JOIN (VALUES ('food_drink', 3500000, true), ('transport', 1200000, true),
    ('shopping', 3000000, false), ('bills', 1000000, false), ('entertainment', 800000, false)) f(key, amount, rollover)
  JOIN seed_categories c ON c.key = f.key;
  INSERT INTO budgets (user_id, user_category_id, amount, month, active)
  SELECT test_user_id, id, 500000, current_month, false FROM seed_categories WHERE key = 'health';

  INSERT INTO saving_goals (user_id, name, icon, target_amount, current_amount, deadline, status, note) VALUES
    (test_user_id, 'Du lịch Nhật Bản', '🗾', 50000000, 18500000, (current_month + interval '6 months')::date, 'active', 'Mục tiêu demo'),
    (test_user_id, 'Quỹ dự phòng', '🛟', 100000000, 45000000, NULL, 'active', NULL),
    (test_user_id, 'MacBook', '💻', 45000000, 45000000, previous_month, 'completed', NULL);

  -- Never schedule already-seeded occurrences or a rule under a debt category.
  INSERT INTO recurring_transactions (user_id, wallet_id, user_category_id, type, amount, note, frequency, start_date, next_run_date, active)
  SELECT test_user_id, f.wallet_id, c.id, f.type, f.amount, f.note, 'monthly', first_month,
         (current_month + interval '1 month')::date + f.day_offset, f.active
  FROM (VALUES
    (wallet_bank, 'housing', 'expense', 6000000, 'Tiền nhà', 0, true),
    (wallet_credit, 'entertainment', 'expense', 260000, 'Đăng ký xem phim', 9, true),
    (wallet_bank, 'salary', 'income', 25000000, 'Lương', 4, true),
    (wallet_bank, 'education', 'expense', 1200000, 'Khóa học đã tạm dừng', 12, false)
  ) f(wallet_id, key, type, amount, note, day_offset, active)
  JOIN seed_categories c ON c.key = f.key;

  UPDATE user_categories SET is_active = false WHERE id = removed_category AND user_id = test_user_id;
  UPDATE wallets w SET balance = opening.opening_balance + coalesce((
    SELECT sum(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
    FROM transactions t WHERE t.wallet_id = w.id AND t.user_id = test_user_id
  ), 0)
  FROM seed_opening_balances opening WHERE opening.wallet_id = w.id AND w.user_id = test_user_id;

  -- Debt principal changes liquid assets and debt together, not net worth.
  INSERT INTO net_worth_snapshots (user_id, net_worth, recorded_date)
  SELECT test_user_id,
    (SELECT sum(opening_balance) FROM seed_opening_balances)
      - (SELECT coalesce(sum(credit_limit), 0) FROM wallets WHERE user_id = test_user_id AND type = 'credit') + coalesce((
      SELECT sum(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
      FROM transactions t LEFT JOIN user_categories c ON c.id = t.user_category_id
      WHERE t.user_id = test_user_id AND t.transaction_date <= day::date
        AND (c.system_key IS NULL OR c.system_key NOT IN ('lend_out', 'borrow_in', 'collect_debt', 'repay_debt'))
    ), 0), day::date
  FROM generate_series(first_month::timestamp, today::timestamp, interval '7 days') day;

  -- Financial and ownership assertions roll back the entire seed on failure.
  IF EXISTS (
    SELECT 1 FROM transactions t
    LEFT JOIN user_categories c ON c.id = t.user_category_id
    JOIN wallets w ON w.id = t.wallet_id
    WHERE t.user_id = test_user_id AND (
      t.transaction_date > today OR w.user_id <> test_user_id OR
      (t.user_category_id IS NOT NULL AND (c.id IS NULL OR c.user_id <> test_user_id OR c.type <> t.type))
    )
  ) THEN RAISE EXCEPTION 'Seed transactions contain a future date, invalid category, or owner/type mismatch.'; END IF;
  IF EXISTS (SELECT 1 FROM wallets WHERE user_id = test_user_id AND (balance < 0 OR (type = 'credit' AND balance > credit_limit))) THEN
    RAISE EXCEPTION 'Seed produced an invalid wallet balance.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM debts d WHERE d.user_id = test_user_id AND d.remaining_amount <>
      d.amount - coalesce((SELECT sum(p.amount) FROM debt_payments p WHERE p.debt_id = d.id AND p.type = 'payment'), 0)
  ) THEN RAISE EXCEPTION 'Seed debt remaining amounts do not match their payments.'; END IF;
  IF EXISTS (
    SELECT p.id FROM debt_payments p JOIN debts d ON d.id = p.debt_id
    LEFT JOIN transactions t ON t.debt_payment_id = p.id AND t.user_id = test_user_id
    WHERE d.user_id = test_user_id GROUP BY p.id, p.amount
    HAVING count(t.id) <> 1 OR min(t.amount) <> p.amount
  ) THEN RAISE EXCEPTION 'Seed debt movements must each have one matching transaction.'; END IF;
  IF EXISTS (
    SELECT transfer_pair_id FROM transactions WHERE user_id = test_user_id AND transfer_pair_id IS NOT NULL
    GROUP BY transfer_pair_id HAVING count(*) <> 2 OR count(DISTINCT wallet_id) <> 2
      OR sum(CASE WHEN type = 'income' THEN amount ELSE -amount END) <> 0
  ) THEN RAISE EXCEPTION 'Seed transfer pairs do not balance.'; END IF;

  RAISE NOTICE 'Seeded %: % transactions, % user categories, 4 wallets, 3 debts. Auth and other accounts were not modified.',
    test_email, (SELECT count(*) FROM transactions WHERE user_id = test_user_id),
    (SELECT count(*) FROM user_categories WHERE user_id = test_user_id);
END;
$seed$;
COMMIT;
