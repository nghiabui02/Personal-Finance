-- DESTRUCTIVE: clear the financial ledger only. Preserves auth, settings,
-- identities, storage objects, project configuration, and migration history.
-- Do not execute until the exact scope, backup and maintenance are approved.
-- Run with ON_ERROR_STOP in the SAME explicit transaction as
-- migrations/20261119090000_user_categories.sql. Never commit this part alone.
do $$
begin
  if coalesce(current_setting('app.category_reset_approved', true), '') <> 'clear_financial_data_keep_auth' then
    raise exception 'Explicit approval is required. Follow the category Store cut-over runbook.';
  end if;
end;
$$;
set local lock_timeout = '5s';
lock table public.bank_statement_imports, public.transactions, public.debt_payments,
  public.debts, public.budgets, public.recurring_transactions, public.saving_goals,
  public.wallets, public.ai_insights_cache, public.net_worth_snapshots,
  public.notification_states, public.user_hidden_categories, public.categories
  in access exclusive mode;

-- Explicit order makes retained tables visible in review; no CASCADE reset.
delete from public.bank_statement_imports;
delete from public.transactions;
delete from public.debt_payments;
delete from public.debts;
delete from public.budgets;
delete from public.recurring_transactions;
delete from public.saving_goals;
delete from public.wallets;
delete from public.ai_insights_cache;
delete from public.net_worth_snapshots;
delete from public.notification_states;
delete from public.user_hidden_categories;
delete from public.categories;
