-- Return one JSON value so PostgREST's row cap cannot truncate a reporting period.
create function public.report_totals(p_start date, p_end date, p_monthly boolean, p_category_ids uuid[] default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with totals as (
    select case when p_monthly then date_trunc('month', t.transaction_date)::date else t.transaction_date end as transaction_date,
      t.type, t.user_category_id, sum(t.amount) as amount, count(*) as count
    from public.transactions t
    where t.user_id = (select auth.uid()) and t.transfer_pair_id is null
      and t.transaction_date >= p_start and t.transaction_date < p_end
      and (p_category_ids is null or t.user_category_id = any(p_category_ids))
    group by 1, 2, 3
  )
  select coalesce(jsonb_agg(to_jsonb(totals) || jsonb_build_object('categories',
    case when u.id is not null then jsonb_build_object('id', u.id, 'name', u.name, 'icon', u.icon,
      'color', u.color, 'system_key', u.system_key, 'is_active', u.is_active, 'template',
      case when c.id is not null then jsonb_build_object('default_key', c.default_key) end) end)), '[]'::jsonb)
  from totals
  left join public.user_categories u on u.id = totals.user_category_id
  left join public.categories c on c.id = u.category_id;
$$;
revoke all on function public.report_totals(date,date,boolean,uuid[]) from public, anon;
grant execute on function public.report_totals(date,date,boolean,uuid[]) to authenticated;
