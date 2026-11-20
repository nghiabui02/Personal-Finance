-- Cron, skip and resume use PostgreSQL calendar arithmetic, including month-end clamping.
create function public.next_recurring_date(p_current date, p_frequency text)
returns date language sql immutable strict security invoker set search_path = '' as $$
  select (p_current + case p_frequency
    when 'daily' then interval '1 day' when 'weekly' then interval '7 days'
    when 'monthly' then interval '1 month' when 'yearly' then interval '1 year' end)::date;
$$;

create function public.skip_recurring_occurrence(p_id uuid)
returns jsonb language sql volatile security invoker set search_path = '' as $$
  update public.recurring_transactions r
    set next_run_date = public.next_recurring_date(r.next_run_date, r.frequency)
    where r.id = p_id and r.user_id = (select auth.uid())
    returning to_jsonb(r);
$$;

create function public.resume_recurring_schedule() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  while new.next_run_date <= v_today loop
    new.next_run_date := public.next_recurring_date(new.next_run_date, new.frequency);
  end loop;
  return new;
end;
$$;
create trigger recurring_resume_schedule before update of active on public.recurring_transactions
  for each row when (new.active and not old.active) execute function public.resume_recurring_schedule();

revoke all on function public.next_recurring_date(date,text), public.skip_recurring_occurrence(uuid),
  public.resume_recurring_schedule() from public, anon;
grant execute on function public.next_recurring_date(date,text), public.skip_recurring_occurrence(uuid) to authenticated;

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
        v_item.next_run_date := public.next_recurring_date(v_item.next_run_date, v_item.frequency);
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
