-- Concurrent contributions update the locked row's current amount and status together.
create function public.contribute_to_saving_goal(p_goal_id uuid, p_amount numeric)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_goal public.saving_goals;
begin
  -- Match the stored amount precision when checking whether the goal is complete.
  p_amount := round(p_amount, 2);
  if p_amount is null or p_amount <= 0 or p_amount in ('NaN', 'Infinity') then
    raise exception 'Enter a positive contribution.' using errcode = 'P0001';
  end if;
  update public.saving_goals
    set current_amount = least(target_amount, current_amount + p_amount),
        status = case when current_amount + p_amount >= target_amount then 'completed' else status end
    where id = p_goal_id and user_id = (select auth.uid()) and status = 'active'
    returning * into v_goal;
  if not found then return null; end if;
  return to_jsonb(v_goal);
end;
$$;
revoke all on function public.contribute_to_saving_goal(uuid,numeric) from public, anon;
grant execute on function public.contribute_to_saving_goal(uuid,numeric) to authenticated;
