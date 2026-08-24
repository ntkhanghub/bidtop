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
**Result:** Done — `lib/normalize-identity.ts` + `lib/normalize-identity.test.ts`, 7/7 passing.
Caught a real bug while writing the tests: Play Store identifies the app via `?id=`, not the path
(`/store/apps/details` is identical for every app) — the first implementation stripped query
strings uniformly and silently merged every Play Store app into one `identity_key`. Fixed with a
per-host rule instead of one uniform "path-significant" list.

### S2-T2 — Shortlink resolution + banned-pattern validation
Server-side: follow redirects on any URL to its final destination before validation; reject if the
resolved destination matches a banned pattern (Telegram/Discord/WhatsApp/Zalo group invite
domains) or is still an unresolved shortener.
**Acceptance:** submitting a bit.ly link that redirects to a normal product site is accepted and
stored using the resolved destination; submitting a link that redirects to a `t.me/joinchat/...`
URL is rejected with a specific, user-visible reason.
**Result:** Done — `lib/content-validation.ts` (`resolveUrl` + `checkBannedPattern`) +
`lib/content-validation.test.ts` (mocked fetch), 6/6 passing. Verified live through the real
`/submit` form, not just unit tests: submitting `https://t.me/somebannedgroup` showed "Không chấp
nhận link chat/mời nhóm (Telegram, Discord, WhatsApp)." and created no row. Banned: Telegram,
Discord, WhatsApp (whole domain), Zalo group invites (`zalo.me/g/...` specifically — a Zalo OA page
is still accepted, matching feature-spec's People & Profiles note). Unresolved shorteners rejected
by domain list.

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
**Result:** Done — `app/submit/page.tsx` (server component, fetches categories + reads
`?amount=`) + `app/submit/submit-form.tsx` (client) + `/api/listings/lookup`. Verified live in
browser against the real DB: a new domain showed "Listing mới — tối thiểu 100.000đ."; entering
50.000đ showed the inline error and did not submit; fixing the amount succeeded.

### S2-T4 — AI category classifier
Call the Claude API with the identity/domain (and fetched page content when available) to suggest
one of the 21 categories from S1-T5; let the submitter see and override the suggestion before
proceeding.
**Acceptance:** a known SaaS domain gets a plausible category suggestion; the submitter can change
it via a dropdown before continuing; the final chosen category (not necessarily the AI's) is what
gets stored.
**Result:** Code done — `lib/categorize.ts` (`suggestCategory`, Claude Haiku 4.5, forced strict
tool call constrained to the 21 slugs, so the model literally cannot return an invalid category)
wired into `/api/listings/classify`, called fire-and-forget from the form after a successful
lookup (per the Risk below — never blocks submission). Any failure (including "no API key") falls
back to `"other"` rather than erroring. **Not yet verified against a real Claude API response** —
`ANTHROPIC_API_KEY` isn't set in `.env`, same shape of blocker as the earlier Supabase/Vercel ones.
The submitter-can-override behavior (`categoryTouched` state) is verified by code review; the
actual suggestion quality is not.

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
**Result:** Done — `/api/listings/submit`, verified live end to end against the real Supabase DB
(not mocked): a fresh submission created `listings.status = 'pending_payment'`,
`listings.amount = 0` (untouched — rank integrity holds even here, before Sprint 3's webhook
exists), and a `bids` row with the right `delta_amount`/`vat_amount` (8% computed correctly)/
`total_charged`. Resubmitting the same identity (via a `www.` + query-string variant, proving
normalization consistency) with the same email returned the *same* `listings.id` and created a
*second* `bids` row (top-up) — confirmed only 1 `listings` row exists for that `identity_key`.
Resubmitting with a different email was rejected with "Domain/handle này đã được đăng ký với email
khác." and created nothing. All test rows cleaned up from Supabase afterward.

## Dependencies
- Requires S1's data model and seeded categories/settings.

## Risks
- LLM category classification latency could make the submit flow feel slow — if it's a real
  problem, move the classifier call off the request path (fire-and-forget, default to `other`
  category, backfill before admin review) rather than blocking the user on it.

## Definition of Done
- [x] All tasks meet their acceptance criteria (S2-T4's live LLM response is the one unverified
      piece — needs `ANTHROPIC_API_KEY`)
- [x] Demo criteria verified end-to-end (all live in-browser against the real Supabase DB: normal
      accept, below-minimum rejection, banned-link rejection, top-up, mismatched-email rejection)
- [x] Tests and lint pass; no skipped tests introduced
- [ ] PROGRESS.md updated; user has reviewed the demo
