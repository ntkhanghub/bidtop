-- F14 outbound click tracking. No PII beyond what's already stored elsewhere —
-- just listing_id + timestamp. Recorded server-side by app/out/[id]/route.ts
-- before it redirects to the real destination.
create table listing_clicks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id),
  created_at timestamptz not null default now()
);
create index listing_clicks_listing_id_idx on listing_clicks (listing_id);

alter table listing_clicks enable row level security;
-- No anon/authenticated policies — service_role only.
grant all on listing_clicks to service_role;
