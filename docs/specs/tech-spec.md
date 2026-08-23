# Tech spec — BidTop.vn

## Overview

BidTop.vn is a server-rendered Next.js monolith backed by PostgreSQL — no microservices, no
message queue, no user-auth system on the public side. The entire product is one core write
operation (`amount = amount + delta`, applied only from a verified payment webhook) and one core
read operation (leaderboard `ORDER BY amount DESC, first_confirmed_at ASC`, filtered to
`status = approved`). Everything else — submission form, AI categorization, admin moderation,
settings — exists to feed that write safely or to serve that read attractively.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend + API | Next.js 15 (App Router, TypeScript) | one codebase for SSR leaderboard pages and API/webhook routes; matches the original outbid.lol's approach |
| Styling | Tailwind CSS | fast to build/iterate with, no separate CSS files to maintain, pairs naturally with the App Router |
| Notifications | Toast (sonner) | transient feedback for payment status, admin actions, settings saves — see Conventions in CLAUDE.md for when to use toast vs. inline field errors |
| Database | PostgreSQL (Supabase, Singapore region) | relational fits the listings/bids ledger; row-level locking on `UPDATE` is what makes the rank engine race-safe for free; Singapore region keeps latency low for VN traffic; managed dashboard/table editor is useful for a solo founder debugging data directly |
| ORM | Prisma | typed queries, migrations; team already comfortable with it from other projects; works against Supabase's Postgres like any other Postgres instance |
| Payment | 9Pay | already integrated on ContentSuper.com (existing team experience); IPN webhook + checksum model fits the "rank only after webhook" requirement |
| Hosting | Vercel | zero-ops for a solo/small team; serverless functions handle the webhook endpoint fine at this traffic scale |
| Category classification | LLM call (Claude Haiku) at submission time | cheap, no training data needed; accuracy is not launch-critical because admin corrects it at approval (F8) |
| Admin auth | Session cookie + hashed password (argon2id), two roles (`admin`, `super_admin`) | small, fixed set of admin accounts — no need for a managed auth provider |

## Architecture

```
Visitor ──GET──▶ / , /category/[slug]  ──▶ Next.js SSR/ISR ──▶ Supabase Postgres (read-only, cached)
                                                                     │
Submitter ─POST─▶ /submit ──▶ normalize + validate ──▶ draft listing + pending bid row
                                    │                              │
                                    ▼                              ▼
                          9Pay checkout session          9Pay redirects submitter
                                    │                     to return_url (display-only,
                                    ▼                      writes nothing)
                          9Pay IPN webhook ──POST──▶ /api/webhooks/9pay
                                                            │
                                              verify checksum + idempotency
                                                            │
                                          DB transaction: amount = amount + delta
                                                            │
                              new listing → status=paid_pending_review (F8 queue)
                              top-up on approved listing → status stays approved, re-sorts now
                                                            │
Admin ──▶ /admin (session auth) ──▶ approve/reject queue, settings (super_admin only)
```

No queue, no background worker: webhook volume is low enough that a synchronous transaction inside
the serverless function is sufficient. Revisit only if 9Pay retries or traffic spikes cause
timeouts.

## Data model

- **`categories`** — `id`, `slug`, `name_vi`, `sort_order`. Seeded with the 21 launch categories
  (Sprint 1, see S1-T5 in `docs/sprints/sprint-01-foundation.md` for the authoritative list).
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

- **9Pay** — checkout/payment-link creation + IPN webhook for payment confirmation. Auth: merchant
  key/secret (env `NINE_PAY_MERCHANT_KEY`, `NINE_PAY_SECRET_KEY` — confirm exact field names
  against the live merchant dashboard in Sprint 3; public docs only confirmed the general IPN +
  checksum pattern, not the literal API contract). Verify checksum on every inbound webhook call.
- **Claude API (Haiku)** — one-shot category classification at submission time. Auth: env
  `ANTHROPIC_API_KEY`. Submitted content is untrusted input — never interpolate raw scraped page
  content into a system prompt with instructions in it.
- **Supabase Postgres** — primary datastore (only its Postgres product is used — Supabase Auth,
  Storage, and Realtime are explicitly not part of this stack). Auth: env `DATABASE_URL` (pooled,
  port 6543, for runtime queries) and `DIRECT_URL` (direct, port 5432, for Prisma migrations) —
  Supabase requires both because its connection pooler doesn't support the session mode Prisma
  Migrate needs.

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

- **Rank integrity is the core threat model.** Only the 9Pay IPN webhook handler, after checksum
  verification, may write to `listings.amount` or `first_confirmed_at`. No other code path —
  including the submit form, the `return_url` redirect handler, or any admin action — is permitted
  to touch these fields directly.
- **Idempotency:** `bids.gateway_order_id` is a unique constraint; the webhook handler checks
  existing `bids.status` before applying the amount increment, so a retried webhook delivery is a
  safe no-op.
- **Guest identity model:** ownership for top-ups is `identity_key + submitter_email` match — no
  password, no magic link in MVP. This is a deliberately weak, low-friction model; if abuse
  (email spoofing to hijack a listing's top-up) shows up post-launch, add email verification
  (magic link) before the top-up flow, not after.
- **Admin auth:** hashed passwords (argon2id), session cookies (httpOnly), role checked
  server-side on every admin route and mutation — never inferred from client-sent role claims.
- **Input validation:** all submission input validated server-side (zod) at the API boundary.
  Shortened URLs are resolved server-side before any validation runs; the resolved destination,
  not the shortener link, is what gets checked and stored.
- **Payments:** no card data ever touches BidTop's servers or logs — 9Pay's hosted
  checkout/payment-link flow only. Webhook checksum is mandatory, not optional-with-fallback.
- **PII:** `submitter_email` is the only PII field; excluded from logs, analytics events, and any
  public rendering.

## Assumptions

- **Hosting** (Vercel) was not explicitly specified by the user — chosen as a boring, mainstream
  default that pairs well with Next.js and Supabase. If the team has a strong existing preference
  (e.g. a different host already used for ContentSuper.com), swap it here before Sprint 1.
- **Toast library** (sonner) was not named by the user beyond "Toast Notification" — chosen as a
  lightweight, App-Router-friendly default. Swap freely before Sprint 1 if the team prefers
  another (e.g. react-hot-toast) — this is a low-cost, low-risk substitution.
- **Team/timeline:** solo founder or very small team running Claude Code sessions; no fixed launch
  date was given, so the sprint plan is sequenced by dependency, not calendar. If there is a real
  deadline, compress by cutting Sprint 5 features to backlog, not by adding parallel work.
- **9Pay API contract details** (exact field names, checksum algorithm specifics) were not
  confirmable from public search results beyond "IPN webhook + SHA256 checksum" — must be verified
  against the actual merchant dashboard docs during Sprint 3. Confirm whether the existing
  ContentSuper.com 9Pay merchant account is reused or a new one is created for BidTop.vn.
- **VAT is not part of the ranked amount.** `listings.amount` is the pre-tax bid value shown on the
  leaderboard and used for all rank comparisons; VAT is computed and charged as a separate line
  item at checkout (`bids.vat_amount`), matching standard VN invoice practice without complicating
  the core mechanic.
- **Top-ups on an already-approved listing skip re-moderation** and apply immediately — only a
  listing's first-ever confirmed payment enters the admin queue (F8), since the content was
  already vetted and only the amount is changing.
- **Rejected-listing refunds are manual** for MVP — the admin processes them outside the system
  (via the 9Pay merchant dashboard directly). No refund API call is wired into BidTop.vn itself.
- **"N online" (F12)** is implemented via lightweight polling/heartbeat, not WebSockets — expected
  concurrency at this stage doesn't justify persistent-connection infrastructure.
- **No third-party analytics vendor** ships in the MVP; the footer revenue counter and online count
  are computed from BidTop's own tables, not an external analytics pipeline.

## Open questions

- **9Pay merchant credentials** — new account for BidTop.vn or reuse the ContentSuper.com one?
  Resolve before Sprint 3 (blocks payment integration work).
- **Domain/trademark check for bidtop.vn** — confirm the domain is actually registered/available
  and there's no conflicting trademark. Resolve before Sprint 6 (launch).
- **Legal review of "Dịch vụ pháp lý" and "Crypto, Web3 & Investing"** — not scheduled in any
  sprint; both categories stay off the list indefinitely until this review happens, independent of
  the MVP timeline.
- **Refund policy formalization** — if manual refunds (see Assumptions) turn out to be frequent,
  revisit before they become an operational burden; no sprint assigned, flag for Sprint 6 review if
  volume is already visible by then.
