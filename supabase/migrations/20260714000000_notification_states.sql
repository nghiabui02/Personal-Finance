-- ============================================================
-- NOTIFICATION STATES
-- Per-user read/dismissed flags for derived notifications.
-- notification_id is the deterministic id computed by
-- /api/notifications; rows whose condition no longer holds are
-- garbage-collected on fetch, which also re-arms dismissed
-- notifications when the condition triggers again later.
-- ============================================================
create table notification_states (
  user_id         uuid        not null references auth.users(id) on delete cascade,
  notification_id text        not null,
  read_at         timestamptz,
  dismissed_at    timestamptz,
  created_at      timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table notification_states enable row level security;

create policy "notification_states: owner full access"
  on notification_states for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
