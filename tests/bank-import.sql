-- Run only against a disposable, fully migrated local Supabase database as
-- postgres. Everything, including fixtures, is rolled back at the end.
begin;

insert into auth.users(id) values
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002');
insert into public.wallets(id, user_id, name, type, balance) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'CSV test bank', 'bank', 100000),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Other user bank', 'bank', 100000);
insert into public.categories(id, user_id, name, type) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Private category', 'expense'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Income only', 'income');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

-- First import and exact retry must move the balance only once. The original
-- description must survive independently from the reviewed transaction title.
do $$
declare
  v_wallet uuid := '20000000-0000-4000-8000-000000000001';
  v_rows jsonb := jsonb_build_array(
    jsonb_build_object('row', 2, 'source_key', repeat('a', 64), 'date', '2026-10-23', 'type', 'income', 'amount', 200000,
      'title', 'Salary', 'category_id', null, 'description', 'VCB original credit', 'reference', 'CSV-CREDIT'),
    jsonb_build_object('row', 3, 'source_key', repeat('b', 64), 'date', '2026-10-23', 'type', 'expense', 'amount', 35000,
      'title', 'Coffee', 'category_id', null, 'description', 'VCB original debit', 'reference', 'CSV-DEBIT')
  );
  v_result json;
begin
  v_result := public.import_bank_statement(v_wallet, v_rows);
  assert (v_result->>'imported')::integer = 2, 'First import must create both transactions';
  assert (v_result->>'balance')::numeric = 265000, 'Balance must follow imported income and expense';
  v_result := public.import_bank_statement(v_wallet, v_rows);
  assert (v_result->>'imported')::integer = 0, 'Retry must create no new transactions';
  assert (v_result->>'skipped')::integer = 2, 'Retry must identify both duplicates';
  assert (v_result->>'balance')::numeric = 265000, 'Retry must not move the balance';
  assert (select count(*) from public.transactions where wallet_id = v_wallet) = 2, 'No duplicate ledger entries';
  assert exists (
    select 1 from public.bank_statement_imports b join public.transactions t on t.id = b.transaction_id
      where b.source_key = repeat('b', 64) and b.bank_description = 'VCB original debit' and t.note = 'Coffee'
  ), 'Original bank description and reviewed title must both be retained';
end;
$$;

-- A later failure must roll back earlier rows, their identities, and balances.
do $$
declare
  v_wallet uuid := '20000000-0000-4000-8000-000000000001';
  v_rows jsonb := jsonb_build_array(
    jsonb_build_object('row', 2, 'source_key', repeat('c', 64), 'date', '2026-10-23', 'type', 'income', 'amount', 1,
      'title', 'Rollback credit', 'category_id', null, 'description', '', 'reference', 'ROLLBACK-CREDIT'),
    jsonb_build_object('row', 3, 'source_key', repeat('d', 64), 'date', '2026-10-23', 'type', 'expense', 'amount', 999999,
      'title', 'Insufficient funds', 'category_id', null, 'description', '', 'reference', 'ROLLBACK-DEBIT')
  );
  v_failed boolean := false;
begin
  begin
    perform public.import_bank_statement(v_wallet, v_rows);
  exception when sqlstate 'P0001' then v_failed := true;
  end;
  assert v_failed, 'An unaffordable batch must fail';
  assert (select balance from public.wallets where id = v_wallet) = 265000, 'A failed batch must preserve balance';
  assert (select count(*) from public.transactions where wallet_id = v_wallet) = 2, 'No partial transactions';
  assert not exists (select 1 from public.bank_statement_imports where source_key = repeat('c', 64)), 'No partial import identities';
end;
$$;

-- Ownership, category direction, reviewed titles, and conflicting bank data
-- must be checked inside the database even when an API route is bypassed.
do $$
declare
  v_wallet uuid := '20000000-0000-4000-8000-000000000001';
  v_entry jsonb := jsonb_build_object('row', 2, 'source_key', repeat('e', 64), 'date', '2026-10-23', 'type', 'expense', 'amount', 1000,
    'title', 'Reviewed', 'category_id', null, 'description', '', 'reference', 'SECURITY-TEST');
  v_case jsonb;
  v_failed boolean;
begin
  assert not exists (select 1 from public.wallets where id = '20000000-0000-4000-8000-000000000002'), 'RLS must hide other wallets';
  begin
    perform public.import_bank_statement('20000000-0000-4000-8000-000000000002', jsonb_build_array(v_entry));
    raise exception 'Cross-user import was accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm = 'Cross-user import was accepted' then raise; end if;
  end;
  for v_case in select value from jsonb_array_elements(jsonb_build_array(
    v_entry || jsonb_build_object('category_id', '30000000-0000-4000-8000-000000000001'),
    v_entry || jsonb_build_object('category_id', '30000000-0000-4000-8000-000000000002'),
    v_entry || jsonb_build_object('title', ' '),
    v_entry || jsonb_build_object('source_key', repeat('b', 64), 'reference', 'CSV-DEBIT', 'amount', 1)
  )) loop
    v_failed := false;
    begin
      perform public.import_bank_statement(v_wallet, jsonb_build_array(v_case));
    exception when sqlstate 'P0001' then v_failed := true;
    end;
    assert v_failed, 'Invalid category, empty title, or changed bank data must be refused';
  end loop;
  assert (select balance from public.wallets where id = v_wallet) = 265000, 'Rejected imports must preserve balance';
end;
$$;

-- Deleting a recorded transaction must not erase its statement identity.
do $$
declare
  v_wallet uuid := '20000000-0000-4000-8000-000000000001';
  v_id uuid;
  v_result json;
begin
  select transaction_id into v_id from public.bank_statement_imports where source_key = repeat('b', 64);
  perform public.delete_transaction(v_id);
  assert exists (select 1 from public.bank_statement_imports where source_key = repeat('b', 64) and transaction_id is null), 'Keep deleted transaction identity';
  v_result := public.import_bank_statement(v_wallet, jsonb_build_array(jsonb_build_object(
    'row', 2, 'source_key', repeat('b', 64), 'date', '2026-10-23', 'type', 'expense', 'amount', 35000,
    'title', 'Retry deleted', 'category_id', null, 'description', 'VCB original debit', 'reference', 'CSV-DEBIT'
  )));
  assert (v_result->>'skipped')::integer = 1, 'Retry must skip deleted transactions';
  assert (v_result->>'balance')::numeric = 300000, 'Retry must not debit a deleted transaction again';
end;
$$;

rollback;
