-- BidTop.vn schema. Replaces the earlier Prisma-managed schema (dropped below,
-- was empty of real data — only seed categories/settings existed).
drop table if exists bids cascade;
drop table if exists listings cascade;
drop table if exists categories cascade;
drop table if exists settings cascade;
drop table if exists admin_users cascade;
drop type if exists listing_status cascade;
drop type if exists bid_status cascade;
drop type if exists admin_role cascade;

create extension if not exists pgcrypto;

create type listing_status as enum ('draft', 'pending_payment', 'paid_pending_review', 'approved', 'rejected');
create type bid_status as enum ('pending', 'confirmed', 'failed');
create type admin_role as enum ('admin', 'super_admin');

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_vi text not null,
  sort_order integer not null
);

-- identity_key is the canonical, normalized domain/path or @handle — see
-- docs/specs/tech-spec.md "Data model" and lib/normalize-identity.ts (Sprint 2).
create table listings (
  id uuid primary key default gen_random_uuid(),
  identity_key text unique not null,
  display_url text not null,
  category_id uuid not null references categories (id),
  status listing_status not null default 'draft',
  -- Only increment_listing_amount() or confirm_bid_and_increment() (called only
  -- from the ZaloPay webhook handler, via service_role) may change this — see
  -- CLAUDE.md Safety rules.
  amount integer not null default 0,
  -- Set once, on this listing's first confirmed payment. Never updated by a later
  -- top-up. Used as the leaderboard tie-break (ORDER BY amount DESC, first_confirmed_at ASC).
  first_confirmed_at timestamptz,
  submitter_email text not null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_leaderboard_idx on listings (status, amount desc, first_confirmed_at asc);
create index listings_category_leaderboard_idx on listings (category_id, status, amount desc, first_confirmed_at asc);

-- Append-only payment ledger — one row per checkout attempt. Doubles as the
-- audit trail for the revenue counter (F13): SUM(total_charged) WHERE status = confirmed.
create table bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id),
  delta_amount integer not null,
  vat_amount integer not null,
  total_charged integer not null,
  gateway_order_id text unique not null,
  gateway_txn_id text,
  status bid_status not null default 'pending',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

-- Runtime-configurable pricing (F9, super_admin only): starting_price, min_increment, vat_percent.
create table settings (
  key text primary key,
  value text not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role admin_role not null default 'admin',
  created_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger listings_set_updated_at before update on listings
for each row execute function set_updated_at();

-- Atomic rank engine: the ONLY way listings.amount may change. A single UPDATE
-- statement is inherently race-safe under Postgres row-level locking — two
-- concurrent calls for the same listing serialize, neither loses an update.
-- first_confirmed_at is set once (coalesce) and never touched again.
create or replace function increment_listing_amount(p_listing_id uuid, p_delta integer)
returns table (amount integer, status listing_status, first_confirmed_at timestamptz)
language plpgsql
security definer
as $$
begin
  return query
  update listings l
  set amount = l.amount + p_delta,
      first_confirmed_at = coalesce(l.first_confirmed_at, now()),
      status = case when l.status = 'approved' then 'approved'::listing_status else 'paid_pending_review'::listing_status end
  where l.id = p_listing_id
  returning l.amount, l.status, l.first_confirmed_at;
end;
$$;

revoke all on function increment_listing_amount(uuid, integer) from public, anon, authenticated;

-- RLS. "Automatic RLS on new tables" already enables this for every table above;
-- these statements are explicit for clarity and to survive a project without that
-- setting. Only the policies below exist — everything else (all writes; all reads
-- of bids/admin_users/non-approved listings) is server-only via service_role,
-- which bypasses RLS entirely. See docs/specs/tech-spec.md Security considerations.
alter table categories enable row level security;
alter table listings enable row level security;
alter table bids enable row level security;
alter table settings enable row level security;
alter table admin_users enable row level security;

create policy "categories are publicly readable" on categories
  for select to anon, authenticated using (true);

create policy "approved listings are publicly readable" on listings
  for select to anon, authenticated using (status = 'approved');

create policy "settings are publicly readable" on settings
  for select to anon, authenticated using (true);

-- No policies on bids or admin_users: anon/authenticated get zero access, by
-- omission, to payment records and password hashes.

-- Table-level privileges (distinct from RLS — both must pass for non-service_role access).
-- service_role is the server-only identity used by lib/supabase/server.ts; it bypasses
-- RLS but still needs the SQL-level grant when tables are created by a non-postgres role.
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- anon/authenticated only need SELECT on the three tables with public policies above.
-- bids and admin_users get nothing at the table level either.
grant select on categories, listings, settings to anon, authenticated;
