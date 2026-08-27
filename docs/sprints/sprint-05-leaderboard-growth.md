# Sprint 5 — Public leaderboard & growth features

**Goal:** The full public-facing product exists: browsable, paginated, category-filtered
leaderboard; the top-up flow for existing owners; and the FOMO/virality features (activity feed,
online counter, revenue counter).

**Demo criteria:** At the end of this sprint a visitor can browse the homepage leaderboard
(50/page), click "claim this rank for X" on any row and land on `/submit` with that price
pre-filled, drill into a category, click a listing out to its real destination (tracked), watch the
latest-activity feed and online counter update, see the footer's live revenue counter, and an
existing listing owner can top up their bid and watch their rank move.

## In scope
- F1 — Public leaderboard homepage
- F2 — Category browsing
- F3 — Static pages (`/rules`, `/about`)
- F10 — Bid increase ("top-up") flow
- F11 — Latest activity feed
- F12 — "N online" counter
- F13 — Footer live revenue counter
- F14 — Outbound click tracking

## Out of scope
- Any new backend mutation logic — this sprint is almost entirely reads plus the top-up path,
  which reuses Sprint 2/3's submission and payment machinery end to end

## Tasks

### S5-T1 — Homepage leaderboard (global) with pagination
Render the S1-T6 query with real pagination, 50 listings per page, favicon/logo display per
listing.
**Acceptance:** with 60+ seeded approved listings, page 1 shows the top 50 by
`amount DESC, first_confirmed_at ASC`, page 2 shows the remaining ones, in the same fixed order.

### S5-T2 — "Claim this rank" pricing shortcut
Add the F1 affordance to every leaderboard row (and the slot above #1): "Chiếm hạng này với giá X"
where `X = row's current amount + settings.min_increment`. Clicking links to `/submit?amount=X`.
**Acceptance:** clicking the affordance on a row showing 3,137,000đ pre-fills the `/submit` amount
field with `3,137,000 + settings.min_increment`; the pre-filled value is still editable and still
subject to S2-T3's minimum validation, not treated as a locked reservation; there is no separate
formula for the #1 slot — it's the same computation against whoever currently holds it.

### S5-T3 — Category pages
`/categories` (index of all 21, with counts) and `/category/[slug]` (same leaderboard query,
filtered to that category).
**Acceptance:** each of the 21 categories has a working page; a listing only appears under its
assigned category, never on unrelated category pages.

### S5-T4 — Static pages
`/rules` and `/about`, content drawn from the product's actual rules (starting price, increment,
VAT, content restrictions, manual-review policy) — not filler text.
**Acceptance:** `/rules` accurately states the current `starting_price`/`min_increment`/`vat_percent`
by reading from `settings`, not hardcoded copy.

### S5-T5 — Top-up UI flow

**2026-08-27 addendum:** "matching email" below no longer applies — the email-match ownership rule
was removed entirely (see `docs/specs/feature-spec.md` F10, `PROGRESS.md` Decisions). Any submitter
can top up any listing; email is optional. Left as historical record, not rewritten.

Public-facing version of Sprint 2's existing-`identity_key` + email-match top-up path, wired to
Sprint 3's real payment flow.
**Acceptance:** a listing owner re-entering their domain + matching email sees their current
amount and a target-amount input enforcing `min_increment`; completing payment moves their rank
immediately per Sprint 3's F7 behavior, with no admin step (per the tech spec's assumption).

### S5-T6 — Latest activity feed
Public feed of recent confirmed bids (new listings and top-ups), most recent first.
**Acceptance:** completing a payment (new or top-up) makes it appear in the feed within one page
load/refresh cycle; the feed never shows `pending`/unconfirmed bids.

### S5-T7 — "N online" counter
Lightweight presence tracking (polling/heartbeat), displayed on the homepage.
**Acceptance:** opening the homepage in two separate sessions shows a count of at least 2; closing
one and waiting past the heartbeat timeout drops the count back down.

### S5-T8 — Footer live revenue counter
Compute `SUM(bids.total_charged) WHERE status = 'confirmed'` and display it in the footer,
refreshed periodically.
**Acceptance:** completing a real payment increases the displayed footer total by that payment's
`total_charged` within one refresh cycle.

### S5-T9 — Outbound click tracking
Clicking a listing's domain navigates out with a UTM-tagged link and records a click event
(no PII beyond what's already stored).
**Acceptance:** clicking a listing opens the real external site with a `utm_source=bidtop`-style
param appended; the click is recorded server-side.

## Dependencies
- Requires Sprint 4's approval flow to have real `approved` listings to browse, and Sprint 3's
  payment pipeline for the top-up flow.

## Risks
- Polling-based online counter (S5-T7) may need tuning (interval, timeout) after real traffic —
  acceptable to ship an approximate count for MVP rather than a precise one.

## Definition of Done
- [ ] All tasks meet their acceptance criteria
- [ ] Demo criteria verified end-to-end
- [ ] Tests and lint pass; no skipped tests introduced
- [ ] PROGRESS.md updated; user has reviewed the demo
