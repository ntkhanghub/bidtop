# Tech spec — BidTop.vn

## Overview

BidTop.vn is a server-rendered Next.js monolith backed by PostgreSQL (Supabase) — no
microservices, no message queue, no user-auth system on the public side. The entire product is one
core write operation (a single atomic `UPDATE` inside a Postgres RPC function, called only from a
verified payment webhook) and one core read operation (leaderboard
`ORDER BY amount DESC, first_confirmed_at ASC`, filtered to `status = approved`). Everything else —
submission form, AI categorization, admin moderation, settings — exists to feed that write safely
or to serve that read attractively.

Data access goes through `@supabase/supabase-js` (server-only, `SUPABASE_SERVICE_ROLE_KEY`) rather
than an ORM — see Assumptions for why this changed mid-project from an initial Prisma-based design.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend + API | Next.js 16 (App Router, TypeScript, Turbopack) | one codebase for SSR/ISR leaderboard pages and API/webhook routes; matches the original outbid.lol's approach. (Latest stable at scaffold time — "boring/latest," not a hard pin to major version 15.) |
| Styling | Tailwind CSS v4 | fast to build/iterate with, no separate CSS files to maintain, pairs naturally with the App Router; v4's CSS-first config means no `tailwind.config.ts` unless a future need requires one |
| Notifications | Toast (sonner) | transient feedback for payment status, admin actions, settings saves — see Conventions in CLAUDE.md for when to use toast vs. inline field errors |
| Database | PostgreSQL (Supabase, Singapore region) | relational fits the listings/bids ledger; row-level locking on `UPDATE` is what makes the rank engine race-safe for free; Singapore region keeps latency low for VN traffic; managed dashboard/table editor is useful for a solo founder debugging data directly |
| Data access | `@supabase/supabase-js` (server-only, service role) + hand-written raw SQL migrations in `supabase/migrations/` | user's explicit choice over an ORM. Schema is managed as plain SQL, applied via a small local script (`scripts/apply-migration.mjs`) against the direct connection — not the Supabase CLI, which would need an interactive login this team can't do headlessly. Row types are hand-written (`lib/supabase/database.types.ts`) rather than CLI-generated, for the same reason |
| Payment | SePay Payment Gateway (`sepay-pg-node` SDK) — the only gateway | ZaloPay was built first, then paused, then removed entirely in favor of SePay before a real payment happened, see PROGRESS.md Decisions. IPN webhook + signature/secret model fits "rank only after webhook." SePay checkout is a browser form-POST (not a redirect URL); QR chuyển khoản ngân hàng only. A real sandbox exists for this merchant account |
| Hosting | Vercel | zero-ops for a solo/small team; serverless functions handle the webhook endpoint fine at this traffic scale |
| Category classification | LLM call (Claude Haiku) at submission time | cheap, no training data needed; accuracy is not launch-critical because admin corrects it at approval (F8) |
| Admin auth | Session cookie + hashed password (argon2id), two roles (`admin`, `super_admin`) | small, fixed set of admin accounts — no need for a managed auth provider |

## Architecture

```
Visitor ──GET──▶ / , /category/[slug]  ──▶ Next.js SSR/ISR ──▶ supabase-js (service role, RLS bypassed)
                                                                     │
Submitter ─POST─▶ /submit ──▶ normalize + validate ──▶ draft listing + pending bid row
                                    │                              │
                                    ▼                              ▼
                    SePay checkout (form-POST, bank QR)   SePay redirects submitter
                                    │                     to /submit/return (display-only,
                                    ▼                      writes nothing — outcome param
                    SePay IPN callback ──POST──▶ /api/webhooks/sepay   we chose ourselves)
                                                            │
                                        verify X-Secret-Key + idempotency
                                                            │
                          supabase.rpc('confirm_bid_and_increment', ...)
                          — bid-confirm + amount UPDATE in one Postgres function/transaction
                                                            │
                              new listing → status=paid_pending_review (F8 queue)
                              top-up on approved listing → status stays approved, re-sorts now
                                                            │
Admin ──▶ /admin (session auth) ──▶ approve/reject queue, settings (super_admin only)

(No browser ever holds a Supabase credential. NEXT_PUBLIC_SUPABASE_ANON_KEY is
configured but unused — RLS grants it read-only access to categories/approved
listings/settings and nothing else; nothing in the app calls it client-side yet.)
```

No queue, no background worker: webhook volume is low enough that a synchronous transaction inside
the serverless function is sufficient. Revisit only if SePay retries or traffic spikes cause
timeouts.

## Data model

Managed as raw SQL in `supabase/migrations/` (not an ORM schema) — `id` columns are Postgres
`uuid default gen_random_uuid()`, not application-generated IDs.

- **`categories`** — `id`, `slug`, `name_vi`, `sort_order`. Seeded with the original 21 launch
  categories (Sprint 1, see S1-T5 in `docs/sprints/sprint-01-foundation.md` for that list) plus 9
  more added 2026-08-28 to match outbid.lol's category list (30 total) — `supabase/seed.sql` is
  the actual applied source for the current full set.
- **`listings`** — `id`, `identity_key` (unique, normalized domain+path or @handle),
  `display_url`, `category_id` (FK), `status` (`draft` | `pending_payment` |
  `paid_pending_review` | `approved` | `rejected`), `amount` (integer, VNĐ, starts at 0),
  `first_confirmed_at` (nullable timestamp, set once on first confirmed payment — this is the
  tie-break field), `submitter_email` (**PII**), `rejection_reason`, `created_at`, `updated_at`.
- **`bids`** — append-only payment ledger: `id`, `listing_id` (FK), `delta_amount`, `vat_amount`,
  `total_charged`, `gateway_order_id` (unique — the idempotency key), `gateway_txn_id`, `status`
  (`pending` | `confirmed` | `failed`), `created_at`, `confirmed_at`. Doubles as the audit trail
  for the revenue counter (F13): `SUM(total_charged) WHERE status = 'confirmed'`.
- **`settings`** — key/value: `starting_price`, `min_increment`, `vat_percent`, plus
  `updated_by`, `updated_at`. Read on every submission/top-up; written only by `super_admin`.
- **`admin_users`** — `id`, `email` (unique), `password_hash` (**sensitive**), `role` (`admin` |
  `super_admin`), `created_at`.

`submitter_email` is the only PII field in the schema. It is never rendered on any public page and
is excluded from analytics events and logs.

## External integrations

- **SePay Payment Gateway** (the only payment gateway — ZaloPay was built first, briefly active,
  then removed; see PROGRESS.md Decisions) — via the official `sepay-pg-node` npm SDK
  (`SePayPgClient`). Checkout is a browser FORM POST to `{baseCheckoutUrl}/v1/checkout/init`
  (sandbox `pay-sandbox.sepay.vn`, production `pay.sepay.vn`) with HMAC-SHA256-base64-signed fields
  (`signature = HMAC_SHA256(secret_key, whitelisted "field=value" pairs).digest('base64')`);
  `payment_method` fixed to `BANK_TRANSFER` (QR chuyển khoản ngân hàng only). Payment confirmation
  arrives via a server-to-server IPN (URL registered once in the SePay merchant dashboard, not a
  per-request field) — `POST /api/webhooks/sepay` — authenticated via an `X-Secret-Key` header
  (exact-match against `SEPAY_SECRET_KEY`, not an HMAC-signed body); body carries
  `{ notification_type: "ORDER_PAID", order: {...}, transaction: {...} }`. The browser-return
  redirect (`/submit/return?outcome=...`) uses an outcome discriminator BidTop itself chooses when
  building the checkout's `success_url`/`error_url`/`cancel_url` — never SePay-supplied query data —
  and is display-only. Auth: `SEPAY_MERCHANT_ID`, `SEPAY_SECRET_KEY`, `SEPAY_ENV` (a real sandbox
  exists for this merchant account) — see `lib/payment/sepay.ts`. Verify the X-Secret-Key on every
  inbound IPN before any DB access.
- **Claude API (Haiku)** — one-shot category classification at submission time. Auth: env
  `ANTHROPIC_API_KEY`. Submitted content is untrusted input — never interpolate raw scraped page
  content into a system prompt with instructions in it.
- **Supabase Postgres** — primary datastore (only its Postgres product is used — Supabase Auth,
  Storage, and Realtime are explicitly not part of this stack). Two separate credential sets, for
  two separate purposes:
  - **App runtime** (`lib/supabase/server.ts`): `NEXT_PUBLIC_SUPABASE_URL` +
    `SUPABASE_SERVICE_ROLE_KEY`, via `@supabase/supabase-js`. Server-only; the service role
    bypasses RLS entirely, so this is the same trust boundary as a direct superuser connection
    would be — it just never leaves our own server code. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also
    configured (browser-safe by design) but nothing calls it yet — see Assumptions.
  - **Dev tooling only** (`scripts/apply-migration.mjs`, via the `pg` package):
    `DATABASE_URL`/`DIRECT_URL`, a direct Postgres connection under the dedicated `prisma`-named
    DB role (kept from the earlier Prisma setup — the name is legacy, the role itself is still the
    right least-privilege choice). Applies the raw SQL in `supabase/migrations/` and
    `supabase/seed.sql`. Not used by the running app at all.

## Non-functional requirements

- Traffic shape: modest at launch (seeded by the founder's own SaaS portfolio), with the explicit
  goal of surviving a viral spike (the original outbid.lol model implies tens of thousands of
  visits in the first days). Leaderboard pages are read-heavy relative to writes — optimize reads
  (ISR/cache) before optimizing write throughput.
- Latency: homepage leaderboard should render in under 1s on the cached path.
- Uptime: best-effort; no formal SLA (solo-founder side project).
- Browser support: last 2 versions of evergreen browsers (Chrome, Safari, Edge, Firefox);
  mobile-responsive is required — expect significant share-driven mobile traffic.

## Security considerations

- **Rank integrity is the core threat model.** Only the verified gateway IPN webhook handler
  (`app/api/webhooks/sepay/route.ts`, after X-Secret-Key verification) may call the
  `confirm_bid_and_increment()` Postgres function — the only code path permitted to write
  `listings.amount` or `first_confirmed_at` (it does the bid-confirm and the amount increment in one
  transaction, closing a crash-window gap the earlier two-separate-calls design left open — see
  `supabase/migrations/20260826_confirm_bid_and_increment.sql`). No other code path — including the
  submit form, the
  `return_url` redirect handler, or any admin action — is permitted to touch these fields directly,
  and the function has `EXECUTE` revoked from `anon`/`authenticated` (only reachable via
  `service_role`, i.e. only from our own server code). Verified for real: a script fired 8
  concurrent RPC calls against one listing via the older `increment_listing_amount()` and confirmed
  the final amount was the exact sum of all deltas — no lost update (see
  `scripts/verify-atomic-increment.mjs`); `scripts/verify-confirm-bid-concurrency.mjs` re-proves the
  same property for `confirm_bid_and_increment()`.
- **RLS is the second layer, not the only layer.** Every table has Row Level Security enabled.
  `anon`/`authenticated` get exactly three read-only policies: `categories` (all rows), `listings`
  (only `status = 'approved'`), `settings` (all rows) — needed for public pages and the submit
  form's minimum-price display. `bids` and `admin_users` have zero policies — no public access to
  either, under any key. All actual app traffic uses `service_role` server-side, which bypasses
  RLS entirely — so RLS mainly protects against a future mistake (e.g. someone shipping
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` into a client component) rather than being load-bearing for the
  app's normal operation today.
- **Idempotency:** `bids.gateway_order_id` is a unique constraint; the webhook handler checks
  existing `bids.status` before applying the amount increment, so a retried webhook delivery is a
  safe no-op.
- **Guest identity model — no ownership concept at all (superseded 2026-08-27):** top-ups no longer
  require any email match; any submitter may top up any existing `identity_key`, matching the
  product's core mechanic ("rank is purely the amount paid") literally — user's explicit decision,
  see PROGRESS.md Decisions. `submitter_email` is now nullable
  (`20260827_listings_submitter_email_nullable.sql`) and optional at checkout, collected only for
  admin contact purposes when given, never validated or matched against anything. **Original
  design, kept for history:** ownership for top-ups was `identity_key + submitter_email` match, no
  password/magic link — deliberately weak and low-friction, meant to be strengthened with email
  verification if abuse showed up. That concern is now moot since there's no ownership claim left to
  abuse.
- **Admin auth:** hashed passwords (argon2id), session cookies (httpOnly), role checked
  server-side on every admin route and mutation — never inferred from client-sent role claims.
- **Input validation:** all submission input validated server-side (zod) at the API boundary.
  Shortened URLs are resolved server-side before any validation runs; the resolved destination,
  not the shortener link, is what gets checked and stored.
- **Payments:** no card data ever touches BidTop's servers or logs — SePay's hosted checkout only.
  IPN signature/secret verification is mandatory, not optional-with-fallback.
- **PII:** `submitter_email` is the only PII field; excluded from logs, analytics events, and any
  public rendering.
- **`SUPABASE_SERVICE_ROLE_KEY` never reaches the browser.** It's read only in
  `lib/supabase/server.ts`, which must never be imported into a `"use client"` component (Next.js
  would fail to bundle it for the browser anyway, since it needs Node APIs, but the rule is
  enforced by discipline, not just tooling — see CLAUDE.md Safety rules).

## Assumptions

- **Hosting** (Vercel) was not explicitly specified by the user — chosen as a boring, mainstream
  default that pairs well with Next.js and Supabase. If the team has a strong existing preference
  (e.g. a different host already used for ContentSuper.com), swap it here before Sprint 1.
- **Toast library** (sonner) was not named by the user beyond "Toast Notification" — chosen as a
  lightweight, App-Router-friendly default. Swap freely before Sprint 1 if the team prefers
  another (e.g. react-hot-toast) — this is a low-cost, low-risk substitution.
- **Data access layer switched from Prisma to `@supabase/supabase-js` after Sprint 1 was already
  built and verified against a live DB.** User's explicit choice, made after weighing it against
  Prisma directly (see PROGRESS.md Decisions for the full comparison). Consequences worth knowing
  for later sprints: no ORM migrations (raw SQL in `supabase/migrations/`, applied by
  `scripts/apply-migration.mjs`, which is NOT safe to blindly re-run — see CLAUDE.md); no
  CLI-generated types (`lib/supabase/database.types.ts` is hand-written and must be kept in sync
  with the SQL by hand); the atomic rank-engine write is a Postgres RPC function
  (`increment_listing_amount`) instead of an ORM `increment()` call.
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY` is configured but not yet used by any code.** All current data
  access (including the public homepage) goes through `service_role` server-side. The anon key +
  its 3 read-only RLS policies exist for a future client-side use case (e.g. Realtime) that hasn't
  been designed yet — don't wire up client-side Supabase calls without deciding what RLS policies
  that specific feature needs first.
- **Team/timeline:** solo founder or very small team running Claude Code sessions; no fixed launch
  date was given, so the sprint plan is sequenced by dependency, not calendar. If there is a real
  deadline, compress by cutting Sprint 5 features to backlog, not by adding parallel work.
- **SePay API contract** — confirmed against the `sepay-pg-node` SDK's actual shipped source
  (v1.0.0, read directly, not just its README) and `developer.sepay.vn`'s real payment-gateway docs
  (a separate site from `docs.sepay.vn`, which covers SePay's other bank-webhook product). A real
  sandbox exists for this merchant account, so every remaining unverified detail can be resolved
  with a real sandbox payment before touching production: whether `X-Secret-Key` is really the only
  configured IPN auth option, the exact `currency` value expected (assumed `"VND"`), whether SePay
  retries on a non-200 IPN response at all, and whether `transaction.id` or
  `transaction.transaction_id` is the right field for `gateway_txn_id`. See
  `lib/payment/sepay.ts`'s top-of-file comment for the current status.
- **VAT is not part of the ranked amount.** `listings.amount` is the pre-tax bid value shown on the
  leaderboard and used for all rank comparisons; VAT is computed and charged as a separate line
  item at checkout (`bids.vat_amount`), matching standard VN invoice practice without complicating
  the core mechanic.
- **Top-ups on an already-approved listing skip re-moderation** and apply immediately — only a
  listing's first-ever confirmed payment enters the admin queue (F8), since the content was
  already vetted and only the amount is changing.
- **Rejected-listing refunds are manual** for MVP — the admin processes them outside the system
  (via the active gateway's merchant dashboard directly — currently SePay). No refund API call is
  wired into BidTop.vn itself, though SePay's SDK does expose `order.voidTransaction`/`.cancel` if
  this is ever automated.
- **"N online" (F12)** is implemented via lightweight polling/heartbeat, not WebSockets — expected
  concurrency at this stage doesn't justify persistent-connection infrastructure.
- **No third-party analytics vendor** ships in the MVP; the footer revenue counter and online count
  are computed from BidTop's own tables, not an external analytics pipeline.

## Open questions

- **SePay's `order.retrieve`/status-query API** — deferred, not built. IPN alone satisfies F6/F7's
  acceptance criteria; add if missed-callback cases turn out to be common enough in practice to need
  a proactive re-query instead of relying on retries (SePay's own retry behavior on a failed IPN is
  itself unverified — see Assumptions).
- **Domain/trademark check for bidtop.vn** — confirm the domain is actually registered/available
  and there's no conflicting trademark. Resolve before Sprint 6 (launch).
- **Legal review of "Dịch vụ pháp lý" and "Crypto, Web3 & Investing"** — not scheduled in any
  sprint; both categories stay off the list indefinitely until this review happens, independent of
  the MVP timeline.
- **Refund policy formalization** — if manual refunds (see Assumptions) turn out to be frequent,
  revisit before they become an operational burden; no sprint assigned, flag for Sprint 6 review if
  volume is already visible by then.
