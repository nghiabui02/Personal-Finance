-- Existing duplicate defaults need an owner decision before this index can be created.
create unique index wallets_one_default_per_owner on public.wallets(user_id) where is_default;

create function public.create_wallet(
  p_name text, p_type text, p_balance numeric, p_icon text, p_color text,
  p_is_default boolean, p_credit_limit numeric, p_statement_day integer, p_payment_due_day integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_owner uuid := public.require_user();
  v_wallet public.wallets;
begin
  if p_is_default then
    -- Serialize competing replacements even when the owner has no default yet.
    perform pg_advisory_xact_lock(hashtextextended(v_owner::text, 0));
    update public.wallets set is_default = false where user_id = v_owner and is_default;
  end if;
  insert into public.wallets(user_id, name, type, balance, icon, color, is_default, credit_limit, statement_day, payment_due_day)
    values(v_owner, p_name, p_type, p_balance, p_icon, p_color, p_is_default, p_credit_limit, p_statement_day, p_payment_due_day)
    returning * into v_wallet;
  return to_jsonb(v_wallet);
end;
$$;
revoke all on function public.create_wallet(text,text,numeric,text,text,boolean,numeric,integer,integer) from public, anon;
grant execute on function public.create_wallet(text,text,numeric,text,text,boolean,numeric,integer,integer) to authenticated;
