# BidTop.vn

Public leaderboard for Vietnamese businesses (SaaS, agencies, real estate, and 18 other
categories) where **rank is purely the amount paid** — a VNĐ clone of outbid.lol's mechanic, no
curation, no quality score.

**Before doing anything else in a session: read `PROGRESS.md`** — it names the current sprint and
next task. Do not infer project status from the file tree.

Scaffold exists (Sprint 4 in progress — see PROGRESS.md). Data access is `@supabase/supabase-js` against a real
Supabase project — not Prisma/an ORM, a deliberate mid-project switch (see PROGRESS.md Decisions
for why). `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`
in `.env` are needed for the app to run for real; see PROGRESS.md Blockers for current status.

## Working principles
Behavioral defaults for every task in this repo — biased toward caution over speed. For trivial
tasks (typo fixes, one-line config tweaks), use judgment rather than applying all of this
ceremony.

**Think before coding**
- State assumptions explicitly; if uncertain, ask instead of guessing.
- If a request has multiple valid interpretations, present them — don't silently pick one.
- If a simpler approach exists than what was asked for, say so; push back when warranted.
- If something is unclear, stop, name what's confusing, and ask — don't code around the confusion.

**Simplicity first**
- Write the minimum code that solves the stated problem. No features, abstractions, or
  configurability beyond what was asked. No error handling for scenarios that can't happen here.
- If you wrote 200 lines and it could be 50, rewrite it. Ask: would a senior engineer call this
  overcomplicated?

**Surgical changes**
- Touch only what the task requires. Don't "improve" adjacent code, comments, or formatting, and
  don't refactor things that aren't broken — match existing style even if you'd do it differently.
- Clean up only what your own change made unused (imports, variables, functions). Leave
  pre-existing dead code alone; mention it instead of deleting it.
- Every changed line should trace back to the current request. In this repo that also means: while
  working a sprint task, don't drift into another sprint's scope (see Sprint workflow) or into
  unrelated files.

**Goal-driven execution**
- Turn the task into something verifiable before starting: a failing test that then passes, a bug
  reproduction that's fixed, or — for sprint work — the task's **Acceptance:** line in the current
  sprint file being satisfied.
- For multi-step work, state a short plan first (step → how you'll verify it), then execute it.
  Strong success criteria let you keep going without checking in; vague ones ("make it work")
  don't — stop and clarify instead of guessing at what "done" means.

## Documentation
- `docs/specs/feature-spec.md` — what we are building and for whom; acceptance criteria per story
- `docs/specs/tech-spec.md` — architecture, data model, stack rationale, assumptions
- `docs/sprints/` — one file per sprint; work only from the current sprint file
- `PROGRESS.md` — live status; update it after every completed task

## Tech stack
- Next.js 16 (App Router, TypeScript, Turbopack) — one codebase for SSR/ISR leaderboard pages and
  API/webhook routes. (Tech spec originally said "15"; 16 was current stable at scaffold time —
  boring/latest-stable was always the intent, not a hard pin to a major version.)
- Tailwind CSS v4 — CSS-first config via `@import "tailwindcss";` in `app/globals.css` and the
  `@tailwindcss/postcss` plugin; there is no `tailwind.config.ts` (v4 doesn't need one for this
  project's needs — don't add one speculatively)
- Toast notifications via sonner — transient feedback (payment status, admin actions, settings
  saved); see Conventions below for when to use it vs. inline field errors
- PostgreSQL (Supabase, Singapore region) via `@supabase/supabase-js` — no ORM. Schema lives as
  raw SQL in `supabase/migrations/` (applied by `scripts/apply-migration.mjs`, a thin `pg`-based
  runner — not the Supabase CLI, which needs an interactive login this team can't do headlessly).
  App runtime (`lib/supabase/server.ts`) uses `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS
  entirely — the same "no card data leaves our server" trust boundary as before, just via
  Supabase's API instead of a raw Postgres connection. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is
  configured but unused (see Non-goals-adjacent note below) — every table's RLS policies (or
  absence of any) are the safety net if it's ever wired up by mistake, not the primary defense.
  The rank engine's atomic write is a Postgres RPC function, `increment_listing_amount()` — see
  Safety rules. Only Supabase's Postgres is used — its Auth, Storage, and Realtime products are
  explicitly out of scope; do not wire them in without asking, since guest checkout with no user
  accounts is a deliberate decision (see Non-goals)
- SePay — the only payment gateway (checkout session + IPN webhook), `lib/payment/sepay.ts`, via
  the official `sepay-pg-node` SDK. QR chuyển khoản ngân hàng only (`payment_method=BANK_TRANSFER`).
  Real sandbox exists for this merchant account — `SEPAY_ENV` picks sandbox/production, fails safe
  to sandbox if unset (see PROGRESS.md Decisions). ZaloPay was built first, briefly active, then
  paused, then removed entirely (user's explicit call) — see PROGRESS.md Decisions.
- Claude API (Haiku) — one-shot category classification at submission time
- Vercel — hosting, zero-ops
- No end-user auth system. Admin auth only: stateless HMAC-signed httpOnly session cookie
  (`lib/auth/session.ts`, no sessions table) + argon2id password hash (`@node-rs/argon2`, chosen
  over the native-binding `argon2` package for more reliable Vercel builds), two roles (`admin`,
  `super_admin`). No admin self-registration — accounts are seeded via `scripts/seed-admin.mjs`.

## Repository layout
```
app/
  layout.tsx                  # root layout — mounts sonner's <Toaster />
  globals.css                 # Tailwind v4 directives
  (public)/                   # S5 — all public routes share layout.tsx (header/nav + footer
                               # with the online counter). Pure route group, URLs unaffected.
    page.tsx                  # homepage leaderboard — paginated 50/page, "claim this rank",
                               # activity feed. Dynamic (searchParams-driven), not ISR-cached.
    submit/                   # moved from bare app/submit/ in S5 — same files, same URLs.
                               # pending/ kicks off SePay checkout (form-POST, see pending-confirm.tsx);
                               # return/ is S3-T3's display-only browser-return handler (no DB writes),
                               # branches on our own ?outcome= param, not gateway-supplied query data
    categories/, category/[slug]/  # S5 — category browsing (F2)
    rules/, about/            # S5 — static pages (F3); about/ has a real-copy TODO placeholder
    _components/               # listing-row, leaderboard, activity-feed, online-counter (client)
  admin/(protected)/          # S4 — login-gated: pending queue (/admin), listings management
                               # (/admin/listings — search/filter/edit-category/unpublish),
                               # settings (super_admin)
  admin/login/                # S4 — public login page
  api/admin/                  # S4 — login/logout, listings/[id]/{approve,reject,category,
                               # unpublish,republish}, settings
  api/payments/sepay/create-order/  # starts a SePay checkout, returns {checkoutUrl, fields}
                               # (a form-POST target, not a redirect URL)
  api/presence/heartbeat/     # S5 — "N online" heartbeat (F12), self-built, no third-party vendor
  api/webhooks/sepay/         # real IPN webhook; verifies X-Secret-Key, calls
                               # confirm_bid_and_increment()
  out/[id]/                   # S5 — outbound click tracking (F14): records a listing_clicks row,
                               # then redirects to display_url with UTM params. Not under /api/ —
                               # a clicked <a href> returning a redirect, not a fetch() endpoint.
lib/
  auth/                       # S4 — password.ts (argon2id), session.ts (signed cookie),
                               # require-admin.ts (server-side role checks for pages/routes)
  email/
    notify.ts                 # best-effort admin notifications via Resend's HTTP API (plain
                               # fetch, no SDK dependency) — new submission + ready-for-review
  supabase/
    server.ts                 # service_role client (server-only, RLS bypassed)
    server.test.ts
    database.types.ts         # hand-written Database type — keep in sync with SQL by hand
  normalize-identity.ts       # (planned, S2) canonical identity_key logic
  payment/order-id.ts         # bids.gateway_order_id generator
  payment/sepay.ts            # sepay-pg-node SDK wrapper, checkout signing, IPN verification
  categorize.ts               # (planned, S2) LLM category classifier
supabase/
  migrations/                 # raw SQL, applied manually — see Commands. Never re-run the
                               # init migration after real data exists; it DROPs tables.
  seed.sql                    # 21 launch categories + default settings (idempotent, upsert-based)
scripts/
  apply-migration.mjs         # runs one SQL file against DIRECT_URL — dev tooling only
docs/{specs,sprints}/
PROGRESS.md
```

## Commands
- `npm run dev` — run the app locally
- `npm run build` — production build (requires real Supabase env vars — the homepage queries
  Postgres at build time via ISR, see `app/page.tsx`)
- `npm test` — unit tests (Vitest + Testing Library, jsdom)
- `npm run lint` — ESLint (flat config, Next core-web-vitals + TypeScript + Prettier compat)
- `npm run typecheck` — `tsc --noEmit`
- `npm run format` — Prettier, writes in place
- `node scripts/apply-migration.mjs supabase/migrations/<file>.sql` — apply one migration file
  (needs `DIRECT_URL`). Additive migrations only after Sprint 1 — never reuse the DROP-based init
  pattern once real data exists.
- `npm run db:seed` — apply `supabase/seed.sql` (needs `DIRECT_URL`, safe to re-run)
- `node scripts/seed-admin.mjs <email> [admin|super_admin]` — create/update an admin account
  (upsert by email); prints a random password once, never stored anywhere else. The only way to
  create admin accounts — there's no self-registration UI by design.

## Conventions
- Money is stored as integer VNĐ (no decimals, no floats) everywhere — `listings.amount`,
  `bids.delta_amount`, `bids.vat_amount`, `bids.total_charged`.
- `listings.amount` is the pre-tax ranked value. VAT is a separate `bids.vat_amount` line, never
  folded into the ranked amount.
- Every category/listing string that's user-facing is Vietnamese; code, comments, and commit
  messages are English.
- Commit format: Conventional Commits (`feat:`, `fix:`, `chore:`), referencing the task ID
  (`feat(S3-T2): create SePay checkout session`).
- Feature flags/backwards-compat shims: don't add them pre-launch — change the code directly.
- Toast (sonner) is for transient, non-blocking feedback: "Đã duyệt", "Đã lưu cài đặt", payment
  failure notices. Field-level validation (e.g. bid amount below the required minimum) stays as an
  inline error next to the field — it must remain visible while the user fixes it, not disappear
  like a toast does.
- Styling is Tailwind utility classes in JSX; no CSS-in-JS, no separate stylesheet per component.

## Sprint workflow
- Work only on tasks from the current sprint file; `PROGRESS.md` names it.
- Complete tasks in order unless dependencies say otherwise. One task = one coherent unit of work
  with its acceptance criteria met.
- After each task: run the checks, then update `PROGRESS.md` (task log entry + next-task pointer).
- A sprint is done when its Definition of Done checklist passes. Ask the user for review before
  starting the next sprint — never roll into it silently.
- Scope changes mid-sprint go to the backlog in `feature-spec.md`, not into the current sprint.

## Safety rules
- Secrets never enter the repo. Configuration via environment variables
  (`SUPABASE_SERVICE_ROLE_KEY` — server-only, bypasses RLS; `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser-safe by design, but currently unused by any code;
  `DATABASE_URL`/`DIRECT_URL` — dev-tooling-only direct Postgres connection for
  `scripts/apply-migration.mjs`; `ANTHROPIC_API_KEY`; `SEPAY_MERCHANT_ID`, `SEPAY_SECRET_KEY`
  (signs checkout requests + verifies inbound IPN), `SEPAY_ENV` (sandbox/production, fails safe to
  sandbox) — the only payment gateway, see `lib/payment/sepay.ts`;
  `ADMIN_SESSION_SECRET` — signs the admin session cookie, see
  `lib/auth/session.ts`; `RESEND_API_KEY`, `ADMIN_NOTIFICATION_EMAIL`, `RESEND_FROM_EMAIL` —
  admin email notifications, see `lib/email/notify.ts`, all three silently no-op if unset); keep
  `.env.example` current and `.env` gitignored. If a secret ever lands in a commit, stop and tell
  the user — rotating it is their call.
- Ask before anything destructive or hard to reverse: dropping/altering DB tables with data,
  deleting files outside the repo, force-pushing, and anything touching production. Migrations in
  `supabase/migrations/` are additive-only past Sprint 1 — a migration that drops or truncates a
  table with real data needs explicit user approval before it's written, not just before it's run.
- Dependencies: prefer mainstream, actively maintained packages; check the name carefully
  (typosquatting) and the license before adding. No new dependency for something under ~20 lines.
- Never commit with failing checks and never bypass hooks (`--no-verify`).
- No real user data (real emails, real payment details) in tests, fixtures, or logs.
- **Rank integrity is the core threat model.** Only the verified gateway IPN webhook handler
  (`app/api/webhooks/sepay/route.ts`) may write `listings.amount`/`first_confirmed_at` — never a
  read-modify-write from application code, never from the submit form, never from the `return_url`
  redirect handler (`app/(public)/submit/return/`, display-only by design). It does so via
  `confirm_bid_and_increment(p_bid_id, p_gateway_txn_id)`, a single Postgres function call that
  row-locks the bid and does both the bid-confirm and the amount-increment in one transaction (see
  `supabase/migrations/20260826_confirm_bid_and_increment.sql`) — the function's `p_gateway_txn_id`
  parameter is a gateway-agnostic opaque string, a leftover from when a second gateway (ZaloPay,
  since removed) also called it; no redesign needed now that only SePay does. The older
  `increment_listing_amount(p_listing_id, p_delta)` function still exists (additive-only past
  Sprint 1) but is no longer called by either real flow. Every rank-writing function has `EXECUTE`
  revoked from `anon`/`authenticated` at the DB level, not just gated in app code (service_role must
  be explicitly re-granted `EXECUTE` in the same migration file — see
  `supabase/migrations/20260824_grant_rank_engine_execute.sql` for the exact bug this guards
  against). The temporary `app/api/payments/mock-confirm/route.ts` stand-in (ungated,
  `increment_listing_amount()`-calling) has been deleted now that the real SePay flow is
  live-verified — see PROGRESS.md.
- Payments: no card data ever touches our servers or logs — SePay's hosted checkout only. Every
  inbound webhook call verifies
  the gateway's signature/secret before any processing; a failed check is rejected outright, before
  any DB access.
- Idempotency: `bids.gateway_order_id` is unique; the webhook handler always checks existing
  `bids.status` before applying an amount increment, so retried deliveries are safe no-ops.
- All submission input (URLs, handles, bid amounts) is validated server-side (zod) at the API
  boundary; never trust client-supplied validation alone.
- `submitter_email` is the only PII field in the schema — never render it publicly, never log it,
  never send it to analytics.
- Admin routes: role (`admin` vs `super_admin`) is checked server-side on every request — never
  inferred from client-sent state.

## Non-goals
- No user accounts or login on the public side — pure guest checkout, no ownership concept at all
  (email is optional, never matched/validated — see PROGRESS.md Decisions, 2026-08-27). Supabase's
  Auth product is not used for this even though it's available in the same project.
- No use of Supabase Storage or Realtime — Supabase is a Postgres host here, nothing else.
- No integration with totnhat.com.vn or the "Vị trí tài trợ" Shopee/Lazada module (Nhóm 2) — that
  is a separate product; do not build it in this repo.
- No "Dịch vụ pháp lý" or "Crypto, Web3 & Investing" categories until a separate legal review is
  done — do not add either as a quick category-list edit.
- No automated refunds and no ML-based NSFW detection in the MVP — rejected listings are refunded
  manually; content safety relies on manual admin review (`docs/sprints/sprint-04-admin-moderation.md`).
- No third-party analytics vendor in the MVP — the footer revenue counter and online count are
  computed from BidTop's own tables.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
