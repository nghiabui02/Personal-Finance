-- =============================================================================
-- Category Store.
--
-- The shared default rows (user_id is null, default_key set) become the
-- catalog. A user adds a template, which creates their own category with its
-- own id; transactions, budgets and recurring rules reference that copy, never
-- the template.
--
-- 1. categories.source_template_id: which template a personal copy came from.
--    At most one copy per user and template, even under concurrent requests.
--    The copy also carries the template's default_key, so its name keeps
--    following the UI language until the user renames it (name_is_custom).
-- 2. adopt_category(): the only way to create a copy; derives every field from
--    the template. A trigger stops anyone else writing provenance.
-- 3. Existing users: every default they have not hidden, plus every default
--    they already use, is added for them. Per user and template, transactions,
--    budgets (every month) and recurring rules move to the copy together, so
--    budget `spent`, rollover and report totals are unchanged. Hidden defaults
--    nobody references are not added; user_hidden_categories is left in place
--    and can be dropped once this is verified.
-- 4. From then on a trigger refuses a new or changed category_id that points at
--    a template, in transactions, budgets and recurring_transactions.
--
-- Rollback before step 4 is safe by dropping the new column, function and
-- triggers; after step 3 the moved references would have to be mapped back
-- through source_template_id first.
-- =============================================================================
set local lock_timeout = '5s';
lock table public.categories in share row exclusive mode;

-- =============================================================================
-- 1. Provenance
-- =============================================================================
alter table public.categories
  add column source_template_id uuid references public.categories (id) on delete set null;

alter table public.categories
  add constraint categories_source_template_personal
  check (source_template_id is null or user_id is not null);

create unique index categories_user_template_unique
  on public.categories (user_id, source_template_id) where source_template_id is not null;

-- A personal copy carries its template's key; no other personal row may.
alter table public.categories drop constraint categories_default_key_shared;
alter table public.categories
  add constraint categories_default_key_shared
  check (default_key is null or user_id is null or source_template_id is not null);

-- =============================================================================
-- 2. Adoption
-- =============================================================================
create function public.adopt_category(p_template_id uuid) returns public.categories
language plpgsql
set search_path to 'public'
as $$
declare
  v_uid      uuid := require_user();
  v_template categories;
  v_copy     categories;
begin
  select * into v_template from categories
    where id = p_template_id and user_id is null and default_key is not null;
  if not found then
    raise exception 'That category is not in the Store.' using errcode = 'P0001';
  end if;

  perform set_config('app.adopting_category', 'on', true);
  insert into categories (user_id, name, type, icon, color, is_default, default_key, source_template_id)
  values (v_uid, v_template.name, v_template.type, v_template.icon, v_template.color,
          false, v_template.default_key, v_template.id)
  on conflict (user_id, source_template_id) where source_template_id is not null do nothing;
  perform set_config('app.adopting_category', 'off', true);

  -- Also reached when the copy already existed, so a retry returns the same id.
  select * into v_copy from categories where user_id = v_uid and source_template_id = v_template.id;
  return v_copy;
end;
$$;

-- Provenance is written by adopt_category() alone. Custom categories created
-- through the API or a native client cannot claim a template or its key.
create function public.guard_category_provenance() returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if coalesce(current_setting('app.adopting_category', true), '') = 'on' or new.user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' and (new.source_template_id is not null or new.default_key is not null) then
    raise exception 'A custom category cannot claim a Store template.' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and (
    new.source_template_id is distinct from old.source_template_id
    or new.default_key is distinct from old.default_key
  ) then
    raise exception 'A category cannot change which Store template it came from.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Created after the backfill below, which writes provenance directly.

-- =============================================================================
-- 3. Existing users
-- =============================================================================
create temporary table store_adoption (
  user_id     uuid not null,
  template_id uuid not null,
  primary key (user_id, template_id)
) on commit drop;

-- Every default the user has not hidden.
insert into store_adoption (user_id, template_id)
select u.id, t.id
from auth.users u
cross join public.categories t
where t.user_id is null and t.default_key is not null
  and not exists (
    select 1 from public.user_hidden_categories h where h.user_id = u.id and h.category_id = t.id
  );

-- Every default something of theirs already references, hidden or not: the
-- references move as a set, so the copy has to exist.
insert into store_adoption (user_id, template_id)
select r.user_id, r.category_id
from (
  select user_id, category_id from public.transactions
  union select user_id, category_id from public.budgets
  union select user_id, category_id from public.recurring_transactions
) r
join public.categories t on t.id = r.category_id and t.user_id is null and t.default_key is not null
on conflict do nothing;

insert into public.categories (user_id, name, type, icon, color, is_default, default_key, source_template_id)
select a.user_id, t.name, t.type, t.icon, t.color, false, t.default_key, t.id
from store_adoption a
join public.categories t on t.id = a.template_id
on conflict (user_id, source_template_id) where source_template_id is not null do nothing;

create temporary table store_copy on commit drop as
select a.user_id, a.template_id, c.id as copy_id
from store_adoption a
join public.categories c on c.user_id = a.user_id and c.source_template_id = a.template_id;

update public.transactions t set category_id = m.copy_id
from store_copy m where t.user_id = m.user_id and t.category_id = m.template_id;

update public.budgets b set category_id = m.copy_id
from store_copy m where b.user_id = m.user_id and b.category_id = m.template_id;

update public.recurring_transactions r set category_id = m.copy_id
from store_copy m where r.user_id = m.user_id and r.category_id = m.template_id;

-- Nothing may still point at a template, or the trigger below would reject the
-- nightly job on its next run.
do $$
begin
  if exists (select 1 from public.transactions t join public.categories c on c.id = t.category_id where c.user_id is null)
    or exists (select 1 from public.budgets b join public.categories c on c.id = b.category_id where c.user_id is null)
    or exists (select 1 from public.recurring_transactions r join public.categories c on c.id = r.category_id where c.user_id is null)
  then
    raise exception 'Some rows still reference a shared category that is not a Store template. Review them before applying.';
  end if;
end;
$$;

-- =============================================================================
-- 4. Cut-over
-- =============================================================================
create trigger categories_guard_provenance
  before insert or update on public.categories
  for each row execute function public.guard_category_provenance();

create function public.reject_template_category() returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.category_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.category_id is not distinct from old.category_id then
    return new;
  end if;

  if exists (select 1 from categories where id = new.category_id and user_id is null) then
    raise exception 'Add this category from the Store before using it.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger transactions_reject_template_category
  before insert or update of category_id on public.transactions
  for each row execute function public.reject_template_category();
create trigger budgets_reject_template_category
  before insert or update of category_id on public.budgets
  for each row execute function public.reject_template_category();
create trigger recurring_transactions_reject_template_category
  before insert or update of category_id on public.recurring_transactions
  for each row execute function public.reject_template_category();
