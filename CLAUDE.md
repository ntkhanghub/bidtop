# BidTop.vn

Public leaderboard for Vietnamese businesses (SaaS, agencies, real estate, and 18 other
categories) where **rank is purely the amount paid** — a VNĐ clone of outbid.lol's mechanic, no
curation, no quality score. Pre-code phase: docs and sprint plan exist, no source yet.

**Before doing anything else in a session: read `PROGRESS.md`** — it names the current sprint and
next task. Do not infer project status from the file tree.

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
- Next.js 15 (App Router, TypeScript) — one codebase for SSR leaderboard pages and API/webhook
  routes
- Tailwind CSS — all styling; no separate `.css` files beyond `app/globals.css`'s Tailwind
  directives
- Toast notifications via sonner — transient feedback (payment status, admin actions, settings
  saved); see Conventions below for when to use it vs. inline field errors
- PostgreSQL (Supabase, Singapore region) via Prisma — row-level locking on `UPDATE` is what makes
  the rank engine race-safe. Only Supabase's Postgres is used — its Auth, Storage, and Realtime
  products are explicitly out of scope; do not wire them in without asking, since guest checkout
  with no user accounts is a deliberate decision (see Non-goals)
- 9Pay — payment gateway (checkout session + IPN webhook), reused integration pattern from
  ContentSuper.com
- Claude API (Haiku) — one-shot category classification at submission time
- Vercel — hosting, zero-ops
- No end-user auth system. Admin auth only: session cookie + argon2id password hash, two roles
  (`admin`, `super_admin`)

## Repository layout (planned — created by S1-T1)
```
app/
  (public)/
    page.tsx                 # homepage leaderboard
    category/[slug]/page.tsx
    categories/page.tsx
    rules/page.tsx
    about/page.tsx
    submit/page.tsx
  admin/                      # protected admin panel
  api/
    webhooks/9pay/route.ts    # ONLY place allowed to write listings.amount
    listings/route.ts
  globals.css                 # Tailwind directives
lib/
  db.ts                       # Prisma client
  normalize-identity.ts       # canonical identity_key logic
  payment/9pay.ts
  categorize.ts               # LLM category classifier
prisma/schema.prisma
tailwind.config.ts
docs/{specs,sprints}/
PROGRESS.md
```

## Commands (to be finalized by S1-T2 — update this section when scaffolding lands)
- `npm run dev` — run the app locally
- `npm run build` — production build
- `npm test` — unit + integration tests
- `npm run lint && npm run typecheck` — must pass before any commit
- `npx prisma migrate dev` — apply schema migrations locally

## Conventions
- Money is stored as integer VNĐ (no decimals, no floats) everywhere — `listings.amount`,
  `bids.delta_amount`, `bids.vat_amount`, `bids.total_charged`.
- `listings.amount` is the pre-tax ranked value. VAT is a separate `bids.vat_amount` line, never
  folded into the ranked amount.
- Every category/listing string that's user-facing is Vietnamese; code, comments, and commit
  messages are English.
- Commit format: Conventional Commits (`feat:`, `fix:`, `chore:`), referencing the task ID
  (`feat(S3-T2): create 9Pay checkout session`).
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
- Secrets never enter the repo. Configuration via environment variables (`DATABASE_URL` — pooled
  Supabase connection, `DIRECT_URL` — direct Supabase connection for migrations,
  `ANTHROPIC_API_KEY`, `NINE_PAY_MERCHANT_KEY`, `NINE_PAY_SECRET_KEY`); keep `.env.example`
  current and `.env` gitignored. If a secret ever lands in a commit, stop and tell the user —
  rotating it is their call.
- Ask before anything destructive or hard to reverse: dropping/altering DB tables with data,
  deleting files outside the repo, force-pushing, and anything touching production.
- Dependencies: prefer mainstream, actively maintained packages; check the name carefully
  (typosquatting) and the license before adding. No new dependency for something under ~20 lines.
- Never commit with failing checks and never bypass hooks (`--no-verify`).
- No real user data (real emails, real payment details) in tests, fixtures, or logs.
- **Rank integrity is the core threat model.** Only the verified 9Pay IPN webhook handler
  (`app/api/webhooks/9pay/route.ts`) may write `listings.amount` or `listings.first_confirmed_at`,
  and only via `amount = amount + delta` inside a DB transaction — never a read-modify-write from
  application code, never from the submit form, never from the `return_url` redirect handler.
- Payments: no card data ever touches our servers or logs — 9Pay's hosted checkout only. Every
  inbound webhook call verifies the checksum/signature before any processing; an invalid signature
  is rejected outright.
- Idempotency: `bids.gateway_order_id` is unique; the webhook handler always checks existing
  `bids.status` before applying an amount increment, so retried deliveries are safe no-ops.
- All submission input (URLs, handles, bid amounts) is validated server-side (zod) at the API
  boundary; never trust client-supplied validation alone.
- `submitter_email` is the only PII field in the schema — never render it publicly, never log it,
  never send it to analytics.
- Admin routes: role (`admin` vs `super_admin`) is checked server-side on every request — never
  inferred from client-sent state.

## Non-goals
- No user accounts or login on the public side — guest checkout + email matching only. Supabase's
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
