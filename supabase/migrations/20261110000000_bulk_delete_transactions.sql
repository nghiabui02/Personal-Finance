-- =============================================================================
-- Deleting a selection of transactions in one go.
--
-- Looping delete_transaction() from the client would be one database
-- transaction per row: a failure half way through — a wallet that would go
-- negative, a debt that no longer accepts the reversal — leaves the rest
-- deleted and no way to tell which. Inside one function the whole selection is
-- a single transaction, so it is all back or nothing back.
--
-- Returns the ids actually removed, which is not always the ids passed in: a
-- transfer takes its sibling leg with it, and the leg may be later in the list.
-- =============================================================================
create function public.delete_transactions(p_ids uuid[])
returns json
language plpgsql
set search_path to 'public'
as $$
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
$$;

revoke execute on function public.delete_transactions(uuid[]) from public, anon;
grant execute on function public.delete_transactions(uuid[]) to authenticated;
