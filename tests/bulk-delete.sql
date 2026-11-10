-- Run only against a disposable, fully migrated local Supabase database as
-- postgres. Everything, including fixtures, is rolled back at the end.
begin;

insert into auth.users(id) values
  ('11000000-0000-4000-8000-000000000001'),
  ('11000000-0000-4000-8000-000000000002');
insert into public.wallets(id, user_id, name, type, balance) values
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Bulk cash',    'cash', 500000),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', 'Bulk bank',    'bank', 500000),
  ('21000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001', 'Bulk drained', 'cash', 0),
  ('21000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000002', 'Other user',   'cash', 500000);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000001', true);

-- A batch of plain spends is removed in full and the wallet is put back to
-- where it started.
do $$
declare
  v_wallet uuid := '21000000-0000-4000-8000-000000000001';
  v_ids    uuid[];
  v_result json;
begin
  select array_agg(
    (public.create_transaction('expense', amount, date '2026-11-10', null, v_wallet)->'transactions'->0->>'id')::uuid
  ) into v_ids
  from unnest(array[10000, 20000, 30000]) as amount;

  assert (select balance from public.wallets where id = v_wallet) = 440000,
    'Fixtures must leave the wallet short by the three spends';

  v_result := public.delete_transactions(v_ids);
  assert json_array_length(v_result->'deleted_transaction_ids') = 3,
    'Every id passed must be reported deleted';
  assert (select count(*) from public.transactions where wallet_id = v_wallet) = 0,
    'No row may survive the batch';
  assert (select balance from public.wallets where id = v_wallet) = 500000,
    'Balance must return to its opening value';
end $$;

-- A transfer deletes both legs at once, so the sibling id later in the same
-- batch is already gone by the time the loop reaches it.
do $$
declare
  v_from uuid := '21000000-0000-4000-8000-000000000001';
  v_to   uuid := '21000000-0000-4000-8000-000000000002';
  v_legs uuid[];
begin
  perform public.transfer_funds(v_from, v_to, 50000, date '2026-11-10');
  select array_agg(id order by id) into v_legs
    from public.transactions where transfer_pair_id is not null;
  assert array_length(v_legs, 1) = 2, 'A transfer must record two legs';

  assert json_array_length(public.delete_transactions(v_legs)->'deleted_transaction_ids') = 2,
    'Both legs must be reported, even though one id took the other with it';
  assert (select count(*) from public.transactions where transfer_pair_id is not null) = 0,
    'Both legs must be gone';
  assert (select balance from public.wallets where id = v_from) = 500000, 'Source wallet must be restored';
  assert (select balance from public.wallets where id = v_to)   = 500000, 'Destination wallet must be restored';
end $$;

-- One row the database refuses takes the whole batch back with it. The income
-- below cannot be reversed in any order: the wallet it landed in has since
-- been emptied into another one, and the second row of the batch sits on a
-- different wallet, so deleting it can never fund the reversal.
do $$
declare
  v_cash    uuid := '21000000-0000-4000-8000-000000000001';
  v_bank    uuid := '21000000-0000-4000-8000-000000000002';
  v_drained uuid := '21000000-0000-4000-8000-000000000003';
  v_income  uuid;
  v_spend   uuid;
begin
  v_income := (public.create_transaction('income', 400000, date '2026-11-10', null, v_drained)->'transactions'->0->>'id')::uuid;
  perform public.transfer_funds(v_drained, v_bank, 400000, date '2026-11-10');
  v_spend  := (public.create_transaction('expense', 10000, date '2026-11-10', null, v_cash)->'transactions'->0->>'id')::uuid;

  assert (select balance from public.wallets where id = v_drained) = 0, 'The income must have been moved out again';
  assert (select balance from public.wallets where id = v_cash) = 490000, 'The second row must have left the cash wallet';

  begin
    perform public.delete_transactions(array[v_spend, v_income]);
    raise exception 'Expected the batch to be refused';
  exception when sqlstate 'P0001' then
    null;
  end;

  assert exists (select 1 from public.transactions where id = v_spend),
    'A refused batch must leave the row it could have deleted';
  assert exists (select 1 from public.transactions where id = v_income),
    'A refused batch must delete nothing';
  assert (select balance from public.wallets where id = v_cash) = 490000,
    'A refused batch must not move a balance';
end $$;

-- Another user's row is invisible, so it is skipped rather than deleted — and
-- never reported as deleted either.
do $$
declare
  v_theirs uuid;
begin
  set local role postgres;
  insert into public.transactions(user_id, wallet_id, type, amount, transaction_date)
    values ('11000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000004', 'expense', 1000, date '2026-11-10')
    returning id into v_theirs;
  set local role authenticated;

  assert json_array_length(public.delete_transactions(array[v_theirs])->'deleted_transaction_ids') = 0,
    'Another user''s row must not be reported deleted';
  set local role postgres;
  assert exists (select 1 from public.transactions where id = v_theirs), 'Their row must still be there';
  set local role authenticated;
end $$;

-- An empty selection is a caller mistake, not a silent no-op.
do $$
begin
  begin
    perform public.delete_transactions(array[]::uuid[]);
    raise exception 'Expected an empty selection to be refused';
  exception when sqlstate 'P0001' then
    null;
  end;
end $$;

rollback;
