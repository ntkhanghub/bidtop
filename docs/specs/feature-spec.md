# Feature spec — BidTop.vn

## Users & problem

BidTop.vn serves two sides of one leaderboard: **founders/businesses** (SaaS, agencies, real
estate, du học, ẩm thực, and 15 other verticals) who want visibility and referral traffic, and
**visitors** who browse a directory and click through to products. Existing directories rank by
curation or "quality," which is slow to earn and easy to dispute. BidTop.vn removes the ambiguity:
**rank is the amount paid — nothing else.** Anyone can out-rank anyone else at any time for a
transparent price. This is a clone of the mechanic proven by outbid.lol ($176k revenue in the
first 77 hours), localized for VNĐ and the Vietnamese SME/startup market.

## Feature list

| ID | Feature | Priority | Sprint |
|-----|---------|----------|--------|
| F1 | Public leaderboard homepage (global + per-category, 50/page, "claim this rank" pricing) | Must | 5 |
| F2 | Category browsing (`/categories`, `/category/[slug]`) | Must | 5 |
| F3 | Static pages (`/rules`, `/about`) | Must | 5 |
| F4 | Listing submission form + identity normalization + content validation | Must | 2 |
| F5 | AI auto-category assignment on submit | Must | 2 |
| F6 | Payment gateway checkout + IPN webhook confirmation (active: SePay; ZaloPay paused) | Must | 3 |
| F7 | Atomic rank engine (amount = amount + delta, race-safe) | Must | 3 |
| F8 | Admin moderation panel (approve/reject pending listings) | Must | 4 |
| F9 | Admin settings (starting price / min increment / VAT %, super_admin only) | Must | 4 |
| F10 | Bid increase ("top-up") flow for existing listings | Must | 5 |
| F11 | Latest activity feed | Must | 5 |
| F12 | "N online" counter | Must | 5 |
| F13 | Footer live revenue counter | Must | 5 |
| F14 | Outbound click tracking (UTM) to external site | Must | 5 |
| F15 | User accounts / bid history dashboard | Later | backlog |
| F16 | "Vị trí tài trợ" module for totnhat.com.vn (Nhóm 2, Shopee/Lazada) | Later | backlog |
| F17 | Additional categories (Làm đẹp, Ô tô, Tài chính tiêu dùng, Du lịch/Lifestyle, Games) | Later | backlog |
| F18 | "Dịch vụ pháp lý" category | Later | backlog (blocked on legal review) |
| F19 | "Crypto, Web3 & Investing" category | Later | backlog (blocked on legal review) |
| F20 | Automated refund flow for rejected listings | Later | backlog |
| F21 | ML-based NSFW/content auto-moderation | Later | backlog |
| F22 | Third-party analytics integration (datafa.st-equivalent) | Later | backlog |

Priorities: **Must** (MVP, ships in one of Sprints 1–6). **Later** (backlog, no sprint assigned).

## User stories

### F1 — Public leaderboard homepage ("claim this rank" pricing)
As a visitor deciding whether to submit a listing, I want to pick the exact rank I want and see
the exact price up front, instead of guessing a bid amount that might land somewhere else.

**Acceptance criteria:**
- Every row on the leaderboard (and the slot above #1) exposes a "Chiếm hạng này với giá X" (claim
  this rank for X) affordance, where `X = that row's current amount + settings.min_increment`.
- Clicking it opens `/submit` with the bid-amount field pre-filled to `X` (still editable) and no
  URL/handle filled in — the submitter still supplies their own identity; nothing about the
  existing listing at that rank is touched by the click itself.
- The pre-filled amount is a **convenience shortcut on top of F4's general rule, not a separate
  threshold** — the same floor (`settings.starting_price` for a brand-new `identity_key`, or `my
  current amount + settings.min_increment` for a top-up) governs whether the amount was typed by
  hand or picked from the leaderboard. There is no special, larger threshold just for rank #1 —
  claiming #1 uses the identical formula against whoever currently holds it.
- The submitter can still type a higher custom amount than the pre-filled `X` (e.g. to make the
  spot harder to immediately reclaim) — `X` is a floor, not a cap.
- The pre-filled price is a snapshot at click time, not a reservation: if the target row's amount
  changes before this submitter's payment is confirmed, their listing still lands wherever its
  paid amount actually sorts to on confirmation (per F7) — never a promised exact slot. This
  follows directly from the platform's core rule that rank is never reserved before payment
  clears.

### F4 — Listing submission form + identity normalization + content validation
As a business owner, I want to submit my website or social handle so that I can enter the
leaderboard.

**Acceptance criteria:**
- Submitting a URL or `@handle` normalizes it to a canonical `identity_key`: lowercase, no
  protocol, no `www.`, no query string, no fragment, no tracking params.
- Store/app links (App Store, Play Store, GitHub) normalize to `domain + path`, e.g.
  `apps.apple.com/app/123456` and `apps.apple.com/app/123456?ref=x` resolve to the same
  `identity_key`; `apps.apple.com/app/999999` (different id) does not collide with it.
- A link resolving (after redirect-following) to a chat/invite domain (Telegram, Discord, WhatsApp,
  Zalo group), or still a shortener after resolution, is rejected with a specific error message —
  never silently stored.
- A shortened URL (bit.ly, etc.) is resolved server-side to its final destination before any
  validation or storage occurs; the destination is what gets stored and checked.
- The chosen bid amount must be ≥ `settings.starting_price` for a brand-new `identity_key`, or ≥
  current listing amount + `settings.min_increment` for an existing one.
- Submitting an amount below the required minimum shows the exact minimum required, inline, before
  checkout.
- A submitted-but-unpaid listing (`status = draft` or `pending_payment`) never appears on any
  public leaderboard and never affects any other listing's rank.

### F5 — AI auto-category assignment on submit
As a submitter, I want my listing auto-sorted into the right category so that I don't have to pick
from 19 options myself.

**Acceptance criteria:**
- On submit, the system calls a classifier with the domain/handle (and page content when
  fetchable) and pre-selects one of the 19 launch categories.
- The submitter can see and override the suggested category before proceeding to payment.
- Admin can still change the category at approval time (F8) if the classifier or the submitter
  got it wrong — this is the actual correctness backstop, not classifier accuracy.

### F6 — Payment gateway checkout + IPN webhook confirmation
As the platform, I want payment confirmation to come only from the gateway's server-to-server IPN
callback so that no one can fake a rank by manipulating the browser redirect. Gateway-neutral by
design: this feature has already been implemented against two gateways (ZaloPay, then SePay) — see
PROGRESS.md Decisions for why, and `lib/payment/{sepay,zalopay}.ts` for the gateway-specific pieces.
Currently active: **SePay**.

**Acceptance criteria:**
- Submitting a valid, sufficient bid amount creates a `bids` row with `status = pending` and a
  unique `gateway_order_id`, then sends the user to the active gateway's checkout for
  `delta_amount + vat_amount`.
- The user-facing browser-return redirect (`/submit/return`) **never** changes any `listings` or
  `bids` row — it only renders a "processing" state. Only the IPN webhook handler writes payment
  outcomes.
- The IPN webhook handler verifies the gateway's signature/secret on every request; a request that
  fails verification is rejected and never processed.
- Receiving the same `gateway_order_id` callback twice (gateway retries) applies the amount
  increment exactly once; the second delivery is a no-op that still acks success.
- A failed or abandoned payment leaves the listing unchanged — no partial rank, no zombie "almost
  paid" state visible anywhere public.

### F7 — Atomic rank engine (amount = amount + delta, race-safe)
As the platform, I want two simultaneous payments to never corrupt each other's rank contribution.

**Acceptance criteria:**
- Confirming a bid applies `UPDATE listings SET amount = amount + :delta WHERE id = :id` inside a
  database transaction — the new amount is never computed by reading-then-writing a snapshot value
  from application code.
- Two webhook confirmations for two different bids on the *same* listing, received within
  milliseconds of each other, both apply in full — the listing's final amount is the sum of both
  deltas, with no lost update, regardless of arrival order.
- Two different listings reaching the same total amount at different times are ordered by whoever
  reached it first: the leaderboard query is `ORDER BY amount DESC, first_confirmed_at ASC`, and
  `first_confirmed_at` is set once, on a listing's *first* confirmed payment, never updated by a
  later top-up.
- The public leaderboard `ORDER BY` only ever considers `status = approved` rows — a
  `paid_pending_review` listing does not appear and does not shift any other listing's visible
  rank until an admin approves it.

### F8 — Admin moderation panel (approve/reject pending listings)
As an admin, I want to review every first-time listing before it goes public so that banned
content never reaches the leaderboard.

**Acceptance criteria:**
- A logged-in admin sees a queue of all `status = paid_pending_review` listings, newest first,
  with the normalized URL, suggested category, and submitter email visible.
- Approving a listing sets `status = approved`; it becomes visible on the public leaderboard at
  its already-locked amount and `first_confirmed_at` immediately — no further payment step.
- Rejecting a listing requires a reason (free text), sets `status = rejected`, and the listing
  never becomes publicly visible. (Refunding the submitter is a manual, out-of-system step for
  MVP — see Assumptions in the tech spec.)
- An admin can correct the category on approve.
- A **top-up** on an already-`approved` listing (F10) does **not** re-enter this queue — it
  applies immediately per F7's acceptance criteria.
- Only authenticated admin/super_admin sessions can view or act on this queue; the check is
  server-side on every request, never inferred from client state.

### F9 — Admin settings (starting price / min increment / VAT %, super_admin only)
As a super_admin, I want to tune pricing without a code deploy so that I can react to launch
demand.

**Acceptance criteria:**
- A settings page exposes `starting_price`, `min_increment`, and `vat_percent` as editable fields,
  visible only to `role = super_admin` (a plain `admin` gets a 403, not just a hidden button).
- Saving a new value takes effect for all *new* submissions and top-ups immediately; it never
  rewrites the `amount` already locked into existing listings.
- Values are validated server-side (positive integers for price/increment, 0–100 for VAT%) before
  saving.

### F10 — Bid increase ("top-up") flow for existing listings
As an existing listing owner, I want to pay only the difference to move up, without re-entering my
whole listing.

**Acceptance criteria:**
- Re-submitting the same normalized `identity_key` with a matching submitter email offers a
  "top-up" flow instead of creating a duplicate listing.
- The submitter enters a target new total amount; the system computes
  `delta = target_amount - current_amount` and requires `delta ≥ settings.min_increment`.
- No one else can claim the rank slot a top-up is "reserving" by paying the same delta on a
  *different* identity — the delta only ever attaches to the specific `listing_id` that generated
  the checkout session; there is no window where the amount bump is claimable by anyone but the
  original listing.
- A confirmed top-up re-sorts the leaderboard immediately (per F7) without changing
  `first_confirmed_at` and without re-entering moderation (per F8).
- An email mismatch on a re-submitted `identity_key` is treated as a new-listing attempt for a
  domain already owned by someone else and is rejected with a clear message (not silently merged).

## MVP cut line

BidTop.vn v1 ships **guest checkout only** — no user accounts, no login, no password anywhere on
the public side. It ships with **21 categories** (see `docs/sprints/sprint-01-foundation.md`
S1-T5 for the authoritative list) covering Nhóm 1 (SaaS/startup, agencies, real
estate as a single category) and does **not** include "Dịch vụ pháp lý" or "Crypto, Web3 &
Investing" as categories pending legal review. Content moderation is **manual admin review**, not
automated NSFW detection — the heuristic checks (banned link patterns, shortlink resolution) run
automatically, but human judgment gates every first-time listing. There is no automated refund
flow, no third-party analytics vendor, and no integration whatsoever with totnhat.com.vn (F16,
Nhóm 2) — that is a distinct product for a later, separate effort.

## Backlog

- **F15 — User accounts/dashboard:** revisit if guest email-matching for top-ups proves too weak
  (spoofed emails, lost access) or if submitters ask for bid history.
- **F16 — "Vị trí tài trợ" for totnhat.com.vn:** separate product (Nhóm 2), Shopee/Lazada seller
  placements, different UX (emphasize sales volume/reviews, not raw bid amount), different
  identity-normalization logic (product IDs, not domains). Do not build inside this repo.
- **F17 — Additional categories:** Làm đẹp & Thẩm mỹ, Ô tô & Xe máy, Tài chính tiêu dùng & Bảo
  hiểm, Du lịch/Địa phương/Lifestyle, Games & Entertainment — add once launch categories show
  traction or a matching seed listing exists.
- **F18/F19 — Legal-gated categories:** "Dịch vụ pháp lý" needs a check against Luật Luật sư and
  Luật Quảng cáo before it can exist as a category (law-firm ad format rules). "Crypto, Web3 &
  Investing" needs a check against NHNN's non-recognition of crypto as a payment instrument and
  Luật Chứng khoán before any investment-return content is accepted. Neither ships until that
  review is done — do not add either as a quick category-list edit.
- **F20 — Automated refunds:** wire a real refund API call to the active gateway (SePay's SDK
  already exposes `order.voidTransaction`/`.cancel`) when reject volume justifies the engineering
  cost; MVP handles it manually.
- **F21 — ML NSFW/content moderation:** only worth building once submission volume makes manual
  review (F8) the bottleneck.
- **F22 — Analytics vendor:** add datafa.st or equivalent once there's real traffic to analyze;
  MVP's own revenue/online counters (F12, F13) cover the launch-critical numbers.
