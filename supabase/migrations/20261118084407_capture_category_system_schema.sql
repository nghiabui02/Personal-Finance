-- Captured from the live schema on 2026-11-18; existing RLS and names are unchanged.
alter table public.categories add column if not exists system_key text;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.categories'::regclass and conname = 'categories_system_key_check') then
    alter table public.categories add constraint categories_system_key_check check (
      system_key is null or system_key in ('lend_out', 'borrow_in', 'collect_debt', 'repay_debt', 'adjust_up', 'adjust_down')
    );
  end if;
end;
$$;
create unique index if not exists categories_user_system_key_unique
  on public.categories (user_id, system_key) where system_key is not null;
