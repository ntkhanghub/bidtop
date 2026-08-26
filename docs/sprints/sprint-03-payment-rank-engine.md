# Sprint 3 — Payment integration & atomic rank engine

**Goal:** A real ZaloPay payment, confirmed only via the server-to-server IPN callback, atomically
updates a listing's amount — safely under concurrent/duplicate delivery.

**Demo criteria:** At the end of this sprint you can complete a real (small, live — no sandbox
exists for this merchant account) ZaloPay QR/wallet payment for a submitted listing and see its
`amount` update correctly in the database purely from the webhook — with the browser-return
redirect proven to write nothing, and a manually-replayed webhook proven to be a no-op the second
time.

## In scope
- F6 — ZaloPay checkout + IPN webhook payment confirmation
- F7 — Atomic rank engine

## Out of scope
- Admin queue UI (Sprint 4) — a `paid_pending_review` listing exists correctly in the DB after
  this sprint but has no admin UI to approve it yet
- Public leaderboard display (Sprint 5)
- ZaloPay's `getstatusbyapptransid` fallback query API — IPN alone satisfies this sprint's
  acceptance criteria; see tech-spec.md Open questions

## Tasks

### S3-T1 — Confirm ZaloPay merchant contract
Resolved from `developers.zalopay.vn`'s public docs + one live call to the production endpoint:
endpoint URLs, request/response field names, and both HMAC-SHA256 mac formulas (createorder mac
over 7 pipe-joined fields with `key1`; IPN mac over the raw `data` string with `key2`; the
browser-return checksum over 7 different pipe-joined fields, also `key2`). Documented at the top
of `lib/payment/zalopay.ts`.
**Still open, needs a real signed call against production (no sandbox for this account) to
confirm:** the mac's exact byte encoding (assumed lowercase hex) and whether
`embeddata.redirecturl` controls the browser-return destination per-request or it's
dashboard-configured only.
**Acceptance:** a documented (in `lib/payment/zalopay.ts`'s top comment) request/response example
for both the checkout-session call and the IPN payload, verified against a real call — not just
public marketing pages.

### S3-T2 — ZaloPay checkout session creation
Replace Sprint 2's placeholder redirect: call ZaloPay to create a checkout session for
`delta_amount + vat_amount`, QR/ZaloPay-wallet only (`bankcode=zalopayapp`, user's explicit
choice). `bids.gateway_order_id` doubles as ZaloPay's `apptransid` (`yymmdd_xxxx`, ≤40 chars),
generated once at bid-insert time (`app/api/listings/submit/route.ts`) so a retried checkout
request never mints a second ZaloPay order for the same bid.
**Acceptance:** initiating checkout from `/submit` lands the user on a real ZaloPay QR/wallet
payment page showing the correct total (bid delta + VAT).

### S3-T3 — `return_url` handler (display-only)
Build the page ZaloPay redirects back to after payment (`/submit/return`). It renders a
"processing, check back shortly" state and explicitly performs **no** database write — it verifies
the browser-return checksum only to pick a cosmetic message, never to gate a write.
**Acceptance:** a code review / test confirms this route has zero `UPDATE`/`INSERT` calls against
`listings` or `bids`; manually hitting this URL with a fake successful-looking query string does
not change any row.

### S3-T4 — IPN webhook handler: mac verification + idempotency
Build `/api/webhooks/zalopay`: verify the HMAC-SHA256 mac per S3-T1's findings; look up the `bids`
row by `gateway_order_id` (via `lib/supabase/server.ts`, `service_role`); if already `confirmed`,
return the success ack without reprocessing; otherwise proceed to S3-T5.
**Acceptance:** a request with a tampered/invalid mac is rejected and no DB write occurs; a valid
callback replayed twice results in exactly one amount increment, confirmed by a test that posts
the same payload twice (`scripts/verify-zalopay-idempotency.mjs`).

### S3-T5 — Atomic amount update + status transition
**Decided:** rather than two separate `supabase-js` calls (increment, then a separate `bids`
update — the gap the original task description flagged as a decision point), a new combined
function, `confirm_bid_and_increment(p_bid_id, p_gateway_txn_id)`
(`supabase/migrations/20260826_confirm_bid_and_increment.sql`), row-locks the bid and does both
the bid-confirm and the `listings` amount increment in one Postgres transaction — genuinely atomic,
one round trip, closing the crash-window gap a two-call design would leave open. The older
`increment_listing_amount(p_listing_id, p_delta)` (S1-T4) stays in place, additive-only, but is no
longer called by the real flow once the interim mock is deleted.
**Acceptance:** a test that fires two confirmations for two different bids on the *same* listing
concurrently (`scripts/verify-confirm-bid-concurrency.mjs`) results in a final `amount` equal to
the sum of both deltas — no lost update; a test confirms `first_confirmed_at` is set on the first
confirmation and unchanged by a later top-up's confirmation.

## Dependencies
- Requires Sprint 2's `listings`/`bids` rows in `pending` state to confirm against.

## Risks
- No sandbox exists for this ZaloPay merchant account — every real end-to-end verification
  (S3-T1's live call, the one full checkout-to-callback test) uses real money. Minimized by
  verifying mac/idempotency/concurrency logic with correctly-signed synthetic payloads (we hold
  `key1`/`key2` ourselves) rather than repeated real ZaloPay calls — see the verification scripts
  above.

## Definition of Done
- [ ] All tasks meet their acceptance criteria
- [ ] Demo criteria verified end-to-end with a real payment
- [ ] Tests and lint pass; no skipped tests introduced
- [ ] `app/api/payments/mock-confirm/route.ts` deleted once the real flow is verified working
- [ ] PROGRESS.md updated; user has reviewed the demo
