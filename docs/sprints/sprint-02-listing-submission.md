# Sprint 2 — Listing submission & identity normalization

**Goal:** A submitter can enter a URL or @handle, have it normalized and validated, get an
AI-suggested category, and land a draft listing + pending bid in the database — everything up to
(but not including) the real payment call.

**Demo criteria:** At the end of this sprint you can fill out the submit form with a real domain,
see it rejected if it's a chat-invite/shortener/NSFW-flagged link, see it accepted with a
suggested category and a computed minimum price, and see a `draft` listing + `pending` bid land
correctly in Postgres — including for a duplicate submission of an already-known
`identity_key`.

## In scope
- F4 — Listing submission form + identity normalization + content validation
- F5 — AI auto-category assignment on submit

## Out of scope
- Real 9Pay checkout call and webhook (Sprint 3) — this sprint ends at "ready to pay," using a
  stub/placeholder redirect
- Admin review (Sprint 4)

## Tasks

### S2-T1 — `normalizeListingIdentity()` utility + unit tests
Write the canonical normalization function: lowercase, strip protocol/`www.`/query
string/fragment/tracking params for plain domains; `domain + path` for App Store/Play
Store/GitHub links; `@handle` normalization for social profiles (strip platform prefix
variations).
**Acceptance:** unit tests cover — plain domain with/without `www.` and query string (same
`identity_key`); two different App Store app IDs on `apps.apple.com` (different `identity_key`);
same app ID with different query params (same `identity_key`); `@handle` vs full profile URL for
the same account (same `identity_key`).

### S2-T2 — Shortlink resolution + banned-pattern validation
Server-side: follow redirects on any URL to its final destination before validation; reject if the
resolved destination matches a banned pattern (Telegram/Discord/WhatsApp/Zalo group invite
domains) or is still an unresolved shortener.
**Acceptance:** submitting a bit.ly link that redirects to a normal product site is accepted and
stored using the resolved destination; submitting a link that redirects to a `t.me/joinchat/...`
URL is rejected with a specific, user-visible reason.

### S2-T3 — Submit form UI + minimum-price computation
Build `/submit`: identity input, live lookup of whether it's a new or existing `identity_key`,
computed minimum acceptable amount (`settings.starting_price` if new,
`current_amount + settings.min_increment` if existing), and a bid-amount input enforcing that
minimum. The amount field accepts an optional `?amount=` query param to pre-fill it (used by
Sprint 5's "claim this rank" leaderboard links) — a pre-filled value is still editable and still
validated against the same computed minimum, never trusted as-is.
**Acceptance:** entering an amount below the computed minimum shows the exact required minimum
inline and blocks submission; entering a valid amount proceeds; loading `/submit?amount=500000`
pre-fills the field with that value but still re-validates it against the real minimum on submit.

### S2-T4 — AI category classifier
Call the Claude API with the identity/domain (and fetched page content when available) to suggest
one of the 21 categories from S1-T5; let the submitter see and override the suggestion before
proceeding.
**Acceptance:** a known SaaS domain gets a plausible category suggestion; the submitter can change
it via a dropdown before continuing; the final chosen category (not necessarily the AI's) is what
gets stored.

### S2-T5 — Draft listing + pending bid creation
On valid submission, create (or reuse, for an existing `identity_key`) a `listings` row and a new
`bids` row (`status = pending`, `delta_amount` = the entered amount minus current amount,
`vat_amount` computed from `settings.vat_percent`), then redirect to a placeholder "proceeding to
payment" page (real 9Pay call lands in Sprint 3).
**Acceptance:** submitting twice for the same new domain does not create two `listings` rows for
the same `identity_key` (unique constraint from S1-T4 holds); an existing-domain resubmission with
a matching stored email creates a top-up bid against the existing listing, not a new one; a
mismatched email on an existing `identity_key` is rejected with a clear "this domain is already
listed" message, not silently merged.

## Dependencies
- Requires S1's data model and seeded categories/settings.

## Risks
- LLM category classification latency could make the submit flow feel slow — if it's a real
  problem, move the classifier call off the request path (fire-and-forget, default to `other`
  category, backfill before admin review) rather than blocking the user on it.

## Definition of Done
- [ ] All tasks meet their acceptance criteria
- [ ] Demo criteria verified end-to-end
- [ ] Tests and lint pass; no skipped tests introduced
- [ ] PROGRESS.md updated; user has reviewed the demo
