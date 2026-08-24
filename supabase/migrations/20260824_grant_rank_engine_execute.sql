-- Fixes a latent bug: service_role lost EXECUTE on increment_listing_amount()
-- as a side effect of 20260823_init.sql's `revoke all ... from public, anon,
-- authenticated`. PostgreSQL grants function EXECUTE via PUBLIC by default;
-- revoking PUBLIC removes it for every non-superuser role that wasn't
-- separately granted, including service_role. Never caught before because the
-- only prior test (scripts/verify-atomic-increment.mjs) called the function
-- over a direct Postgres connection as the "prisma" role, not through
-- supabase-js/PostgREST as service_role — the path every real caller
-- (mock-confirm today, the ZaloPay webhook in Sprint 3) actually uses.
grant execute on function increment_listing_amount(uuid, integer) to service_role;
