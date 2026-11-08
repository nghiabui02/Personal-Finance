-- Statement identities survive transaction edits/deletions, so retrying an
-- import cannot credit or debit the wallet twice. Original bank text stays here.
create table public.bank_statement_imports (
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  source_key text not null check (source_key ~ '^[0-9a-f]{64}$'),
  transaction_id uuid references public.transactions(id) on delete set null,
  transaction_date date not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(15,2) not null check (amount > 0),
  bank_description text not null,
  bank_reference text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, wallet_id, source_key)
);

create unique index bank_statement_reference_unique
  on public.bank_statement_imports(user_id, wallet_id, bank_reference)
  where bank_reference <> '';

alter table public.bank_statement_imports enable row level security;
create policy "bank statements: owner full access"
  on public.bank_statement_imports for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.wallets w where w.id = wallet_id and w.user_id = auth.uid()
    ) and (transaction_id is null or exists (
      select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid()
    ))
  );
grant select, insert, update, delete on public.bank_statement_imports to authenticated;

-- Reuse the existing money function inside the same database transaction.
create function public.import_bank_statement_row(p_wallet_id uuid, p_entry jsonb)
returns boolean
language plpgsql
security invoker
set search_path = 'public'
as $$
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
$$;

create function public.import_bank_statement(p_wallet_id uuid, p_entries jsonb)
returns json
language plpgsql
security invoker
set search_path = 'public'
as $$
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
$$;

revoke execute on function public.import_bank_statement(uuid, jsonb) from public, anon;
revoke execute on function public.import_bank_statement_row(uuid, jsonb) from public, anon;
grant execute on function public.import_bank_statement(uuid, jsonb) to authenticated;
grant execute on function public.import_bank_statement_row(uuid, jsonb) to authenticated;
