-- F12 "N online" counter — self-built polling/heartbeat, no WebSockets/Realtime
-- (see tech-spec.md Assumptions). Client pings every ~15s; a row counts as
-- "online" while last_seen is within the last 45s (checked at read time, no
-- cleanup job needed for an approximate MVP count).
create table online_heartbeats (
  session_id uuid primary key,
  last_seen timestamptz not null default now()
);
create index online_heartbeats_last_seen_idx on online_heartbeats (last_seen);

alter table online_heartbeats enable row level security;
-- No anon/authenticated policies — service_role only, same pattern as bids/admin_users.
grant all on online_heartbeats to service_role;
