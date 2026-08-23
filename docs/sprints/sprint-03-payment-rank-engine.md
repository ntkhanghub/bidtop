# Sprint 3 — Payment integration & atomic rank engine

**Goal:** A real 9Pay payment, confirmed only via the server-to-server IPN webhook, atomically
updates a listing's amount — safely under concurrent/duplicate webhook delivery.

**Demo criteria:** At the end of this sprint you can complete a real (sandbox or small live) 9Pay
payment for a submitted listing and see its `amount` update correctly in the database purely from
the webhook — with the browser-side redirect proven to write nothing, and a manually-replayed
webhook proven to be a no-op the second time.

## In scope
- F6 — 9Pay checkout + IPN webhook payment confirmation
- F7 — Atomic rank engine

## Out of scope
- Admin queue UI (Sprint 4) — a `paid_pending_review` listing exists correctly in the DB after
  this sprint but has no admin UI to approve it yet
- Public leaderboard display (Sprint 5)

## Tasks

### S3-T1 — Confirm 9Pay merchant contract
Resolve the tech-spec's open question: obtain (or confirm reuse of) 9Pay merchant credentials,
and pin down the exact checkout-session API request/response shape and IPN webhook payload +
checksum algorithm from the live merchant dashboard docs.
**Acceptance:** a documented (in code comments or a short internal note) request/response example
for both the checkout-session call and the IPN payload, verified against a real sandbox call —
not just public marketing pages.

### S3-T2 — 9Pay checkout session creation
Replace Sprint 2's placeholder redirect: call 9Pay to create a checkout session for
`delta_amount + vat_amount`, store the `gateway_order_id` on the `bids` row, redirect the
submitter to 9Pay's hosted checkout.
**Acceptance:** initiating checkout from `/submit` lands the user on a real 9Pay payment page
showing the correct total (bid delta + VAT).

### S3-T3 — `return_url` handler (display-only)
Build the page 9Pay redirects back to after payment. It renders a "processing, check back
shortly" state and explicitly performs **no** database write.
**Acceptance:** a code review / test confirms this route has zero `UPDATE`/`INSERT` calls against
`listings` or `bids`; manually hitting this URL with a fake successful-looking query string does
not change any row.

### S3-T4 — IPN webhook handler: signature verification + idempotency
Build `/api/webhooks/9pay`: verify the checksum/signature per S3-T1's findings; look up the `bids`
row by `gateway_order_id`; if already `confirmed`, return success without reprocessing; otherwise
proceed to S3-T5's transaction.
**Acceptance:** a request with a tampered/invalid checksum is rejected and no DB write occurs; a
valid webhook replayed twice results in exactly one amount increment, confirmed by a test that
posts the same payload twice.

### S3-T5 — Atomic amount update + status transition
Inside a single DB transaction: `UPDATE listings SET amount = amount + :delta WHERE id = :id`;
mark the bid `confirmed`; if this is the listing's first-ever confirmed bid, set
`first_confirmed_at = now()` and `status = 'paid_pending_review'`; if the listing was already
`approved`, leave `status = 'approved'` (top-up applies immediately, no re-review).
**Acceptance:** a test that fires two confirmations for two different bids on the *same* listing
concurrently (e.g. parallel requests) results in a final `amount` equal to the sum of both deltas
— no lost update; a test confirms `first_confirmed_at` is set on the first confirmation and
unchanged by a later top-up's confirmation.

## Dependencies
- Requires Sprint 2's `listings`/`bids` rows in `pending` state to confirm against.

## Risks
- 9Pay's exact webhook retry behavior (timing, payload) is unknown until S3-T1 — if retries are
  aggressive or payloads are inconsistent, idempotency handling (S3-T4) may need adjustment
  mid-sprint.

## Definition of Done
- [ ] All tasks meet their acceptance criteria
- [ ] Demo criteria verified end-to-end with a real payment
- [ ] Tests and lint pass; no skipped tests introduced
- [ ] PROGRESS.md updated; user has reviewed the demo
