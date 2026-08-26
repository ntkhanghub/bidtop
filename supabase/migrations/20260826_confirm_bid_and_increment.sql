-- Combines bid confirmation + the listings amount increment into ONE atomic
-- Postgres function call (one transaction), for the real ZaloPay IPN webhook
-- (app/api/webhooks/zalopay). The interim mock (app/api/payments/mock-confirm,
-- being deleted this sprint) called increment_listing_amount() and then
-- updated bids as two separate supabase-js round trips — if a crash happened
-- between them, a retried webhook would find bids.status still 'pending' and
-- increment listings.amount a second time, since the idempotency check gates
-- on bids.status. Row-locking the bid first also serializes two concurrent
-- deliveries for the SAME bid instead of letting them race.
-- increment_listing_amount() itself is left untouched (additive-only past
-- Sprint 1) — it just becomes unused once the mock is deleted.
create or replace function confirm_bid_and_increment(p_bid_id uuid, p_gateway_txn_id text)
returns table (
  amount integer,
  status listing_status,
  first_confirmed_at timestamptz,
  already_confirmed boolean
)
language plpgsql
security definer
as $$
declare
  v_listing_id uuid;
  v_delta integer;
  v_bid_status bid_status;
begin
  select b.listing_id, b.delta_amount, b.status
    into v_listing_id, v_delta, v_bid_status
  from bids b
  where b.id = p_bid_id
  for update;

  if not found then
    raise exception 'confirm_bid_and_increment: bid % not found', p_bid_id;
  end if;

  if v_bid_status = 'confirmed' then
    return query
    select l.amount, l.status, l.first_confirmed_at, true
    from listings l
    where l.id = v_listing_id;
    return;
  end if;

  update bids
  set status = 'confirmed', confirmed_at = now(), gateway_txn_id = p_gateway_txn_id
  where id = p_bid_id;

  return query
  update listings l
  set amount = l.amount + v_delta,
      first_confirmed_at = coalesce(l.first_confirmed_at, now()),
      status = case when l.status = 'approved' then 'approved'::listing_status else 'paid_pending_review'::listing_status end
  where l.id = v_listing_id
  returning l.amount, l.status, l.first_confirmed_at, false;
end;
$$;

-- PostgreSQL grants function EXECUTE via PUBLIC by default; revoking PUBLIC
-- removes it for every non-superuser role that wasn't separately granted,
-- including service_role — the exact bug already hit once for
-- increment_listing_amount() (see 20260824_grant_rank_engine_execute.sql).
-- Both statements below live in this same migration so that mistake can't
-- repeat here.
revoke all on function confirm_bid_and_increment(uuid, text) from public, anon, authenticated;
grant execute on function confirm_bid_and_increment(uuid, text) to service_role;
