-- Wallet reconciliation files its difference as a transaction rather than
-- overwriting the balance, so it needs a category of its own to keep drift
-- separable from real spending in reports.
--
-- `categories.system_key` is guarded by a CHECK that listed only the four debt
-- keys. Recreate it with the adjustment keys included.

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_system_key_check;

ALTER TABLE categories
  ADD CONSTRAINT categories_system_key_check
  CHECK (
    system_key IS NULL
    OR system_key IN (
      -- debt bookkeeping
      'lend_out',
      'borrow_in',
      'collect_debt',
      'repay_debt',
      -- balance reconciliation
      'adjust_up',
      'adjust_down'
    )
  );
