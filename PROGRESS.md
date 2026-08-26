# Progress

Single source of truth for project status. Every session updates this file after each completed
task; no session starts work without reading it.

**Current sprint:** Sprint 3 — Payment integration & atomic rank engine (real ZaloPay gateway).
**Next task:** the user needs to add `ZALOPAY_APP_ID`/`ZALOPAY_KEY1`/`ZALOPAY_KEY2` to `.env`
(production credentials — no sandbox exists for this merchant account) before S3-T1's live
verification can happen. All of S3-T1 (docs)/T2/T3/T4/T5's *code* is written and passes lint/
typecheck/`npm test`/`npm run build`, but nothing has been live-verified yet: the new migration
(`20260826_confirm_bid_and_increment.sql`) is not applied to production, no real ZaloPay payment
has been completed, and `app/api/payments/mock-confirm/route.ts` is therefore still in place (not
yet deleted — see Blockers). Once credentials are added: apply the migration (needs explicit user
confirmation, same as every prior migration), push to a Vercel preview deploy, register that
preview's `/api/webhooks/zalopay` as the ZaloPay callback URL, complete one real small payment, run
`scripts/verify-confirm-bid-concurrency.mjs` and `scripts/verify-zalopay-idempotency.mjs`, then
delete the mock and its call site.

## Sprint status

| # | Sprint | Status | Started | Finished |
|---|--------|--------|---------|----------|
| 1 | Foundation | Done | 2026-08-23 | 2026-08-24 |
| 2 | Listing submission & identity normalization | Done | 2026-08-24 | 2026-08-24 |
| 3 | Payment integration & atomic rank engine | In progress — code complete, live verification pending real ZaloPay credentials (see Next task) | 2026-08-26 | — |
| 4 | Admin panel & moderation | Done | 2026-08-24 | 2026-08-24 |
| 5 | Public leaderboard & growth features | S5-T1–T7,T9 done; T8 deferred (see task log) | 2026-08-25 | — |
| 6 | Hardening & launch | Not started | — | — |

## Task log
<!-- Newest first. One line: date · task ID · outcome · commit/PR if any -->
- 2026-08-26 · Sprint 3 (S3-T1..T5) — ZaloPay integration built, NOT yet live-verified · Planned via
  /plan mode: read `developers.zalopay.vn`'s public docs (the "Cổng ZaloPay"/Website-Gateway
  `v001/tpe` API, not the newer wallet-only Open API) and confirmed the response field names
  (`returncode`/`returnmessage`/`orderurl`/`zptranstoken`) for real against a live unauthenticated
  call to the production `createorder` endpoint. Resolved 3 questions with the user first: no
  sandbox exists for this merchant account (testing is production-only, minimized to real money
  wherever a correctly-signed synthetic payload can substitute); webhook testing via Vercel preview
  deploys, not a local tunnel; `bankcode` fixed to `zalopayapp` (QR/ZaloPay-wallet only, no card
  entry — user's explicit choice) and no PII (`submitter_email`/phone/address) sent to ZaloPay
  (`appuser` = bid id instead).
  **New:** `lib/payment/zalopay.ts` (`buildApptransid` — VN-local-time `yymmdd_xxxx`,
  `createZaloPayOrder`, `verifyIpnMac`, `verifyReturnChecksum` — plain `fetch` + Node's built-in
  `crypto`, no new dependency, matching `lib/email/notify.ts`'s house style) +
  `lib/payment/zalopay.test.ts` (self-contained fixture-key round-trip tests, not real credentials).
  `app/api/payments/zalopay/create-order/route.ts` (starts checkout, returns `orderUrl`).
  `app/(public)/submit/return/page.tsx` (S3-T3's display-only browser-return handler — verified
  zero `supabase.from`/`.rpc` calls in the file). `app/api/webhooks/zalopay/route.ts` (S3-T4/T5 —
  verifies mac before any DB call, idempotent on `bids.status`).
  **Decided (S3-T5's explicit "decide here"):** a new combined RPC,
  `confirm_bid_and_increment(p_bid_id, p_gateway_txn_id)`
  (`supabase/migrations/20260826_confirm_bid_and_increment.sql`, **not yet applied**), row-locks the
  bid and does the bid-confirm + `listings` amount increment in one transaction — closing a real
  double-increment race the two-separate-calls pattern (still used by the temporary mock) is exposed
  to. Included its own `grant execute ... to service_role` in the same migration, learning directly
  from the exact bug already hit once for `increment_listing_amount()`
  (`20260824_grant_rank_engine_execute.sql`).
  **Changed:** `app/api/listings/submit/route.ts` now generates the real ZaloPay `apptransid`
  (replacing the `pending-${randomUUID()}` stub) directly as `bids.gateway_order_id` at insert time.
  `app/(public)/submit/pending/pending-confirm.tsx` rewired from auto-firing the mock to POSTing the
  new create-order route and redirecting to `orderUrl`.
  **New verification scripts** (same `pg`-direct-connection pattern as
  `scripts/verify-atomic-increment.mjs`): `scripts/verify-confirm-bid-concurrency.mjs` (two
  different bids confirmed concurrently on one listing — no lost update, replay is a no-op) and
  `scripts/verify-zalopay-idempotency.mjs` (posts a correctly-signed synthetic IPN payload at the
  real running webhook route twice — no real ZaloPay call needed since we hold `key2` ourselves).
  Neither has been run yet — both need the new migration applied first, and the idempotency script
  also needs a running dev server + `ZALOPAY_KEY2`.
  **Spec cleanup:** every 9Pay/`NINE_PAY_*` reference across `CLAUDE.md`, `docs/specs/tech-spec.md`,
  `docs/specs/feature-spec.md`, `docs/sprints/sprint-0{2,3,6}-*.md`, `.env.example`, and one comment
  in `supabase/migrations/20260823_init.sql` updated to ZaloPay language (closes the deferred-rename
  Decision below). `docs/sprints/sprint-06-hardening-launch.md`'s S6-T5 rewritten from "switch
  sandbox→production" (never applicable here) to "re-point the ZaloPay callback URL from the Sprint
  3 preview deploy to the final `bidtop.vn` domain."
  **NOT done yet, blocking a real demo** (see Blockers): `ZALOPAY_APP_ID`/`KEY1`/`KEY2` aren't in
  `.env`; the new migration isn't applied to production; no real ZaloPay payment has been completed
  (so the `redirecturl`/mac-encoding open questions in `lib/payment/zalopay.ts`'s top comment are
  still unresolved); `app/api/payments/mock-confirm/route.ts` and its ungated production reachability
  are therefore still in place. Verified so far: `npm run lint`/`npm run typecheck`/`npm test`
  (21/21, +7 new)/`npm run build` all pass.
- 2026-08-25 · Front-end + admin UI rebuilt on shadcn/ui with a đỏ-vàng (red/gold) theme + dark
  mode (not a sprint task — user request, following a live CSS/theme audit of outbid.lol earlier in
  the session and an approved /plan). **Foundation**: `components.json` (new-york style, CSS
  variables) + `npx shadcn add` for `button card badge input select alert avatar separator label
  sonner` — the CLI wrote component source but silently failed to install their dependencies or
  scaffold `lib/utils.ts`/`app/globals.css`'s theme block, both completed by hand
  (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css` installed
  separately). `app/globals.css` now carries the full light+dark CSS variable set (own đỏ-vàng
  values, outbid's variable *naming* only) plus a bidtop-specific `--live` token for the online
  indicator. **Fonts**: swapped the requested DM Sans for **Plus Jakarta Sans** — verified directly
  in `next/font/google`'s `font-data.json` that DM Sans has no `vietnamese` subset (only
  `latin`/`latin-ext`), which would've broken tone-mark glyph rendering across nearly all
  user-facing text; Plus Jakarta Sans is a variable font with a full `vietnamese` subset and a
  similar geometric-sans feel. Geist Mono (unaffected, already has `vietnamese`) wraps every money
  amount in `font-mono tabular-nums`. **Dark mode**: one shared `next-themes` provider
  (`components/theme-provider.tsx`) for the whole app; the toggle (`components/theme-toggle.tsx`)
  renders only in the public header — admin has no toggle but still follows whatever theme is
  active, per user decision. **Scope**: all 22 existing page/component files reskinned (Button/
  Card/Badge/Input/Select/Alert/Avatar), plus new status-color badges in admin (none existed
  before: approved→`--live` green, rejected→destructive red, pending→accent gold, unpublished→
  muted). Field-level validation errors deliberately kept as plain inline text (not Alert/toast) —
  CLAUDE.md's existing, explicit convention. One deliberate deviation from the plan: the admin
  listings search/filter bar stayed a native zero-JS `<select>`/GET-form (hand-styled to match, not
  swapped to Radix `Select`) since Radix's Select can't drive native form submission the same way
  and the existing bookmarkable-URL filtering wasn't broken. Caught and fixed one real bug: the new
  `react-hooks` ESLint rule flagged the standard next-themes mount-detection `useEffect` pattern as
  a cascading-render risk — rewrote `useMounted()` with `useSyncExternalStore` instead. Verified:
  lint/typecheck/`npm test`(14/14)/`npm run build` all pass; live in-browser against the real
  Supabase DB (not mocks) — homepage light+dark (colors/fonts/radius all confirmed via computed
  styles matching the palette exactly), submit form's Select + below-minimum validation error
  (confirmed inline, not toast, correct `--destructive` color), admin queue/listings/settings pages
  under a real `super_admin` session (status badge colors, native filter form, empty states, sonner
  toast theming) — all with zero console errors. Pixel screenshots weren't available this session
  (Browser pane wasn't displayed client-side), so verification relied on computed-style assertions
  and DOM/accessibility-tree inspection instead — noted to the user as a real limitation, not
  skipped.
- 2026-08-25 · Sprint 5 done except S5-T8 (S5-T1 through T7, T9) · Planned via /plan mode: confirmed
  F2/F3/F11/F12/F13/F14 have no acceptance-criteria section anywhere in feature-spec.md (only the
  sprint file's own task descriptions specify them), designed the 3 missing data models from
  scratch, resolved 6 open questions with the user first (route restructuring, online-counter
  mechanism, click-tracking mechanism, `/about` content timing — plus a detour: user initially
  wanted the online counter backed by Vemetric.com; verified via their real API docs that they have
  no purpose-built live-count endpoint (only historical/windowed analytics queries) and would need a
  new client-side SDK, which also contradicts CLAUDE.md's/tech-spec.md's existing "no third-party
  analytics vendor" non-goal — reverted to the self-built design, no vendor).
  **Route restructuring**: `app/page.tsx` and `app/submit/**` moved into `app/(public)/` (pure
  route-group rename via `git mv`, zero URL changes) so a new shared `app/(public)/layout.tsx`
  (header/nav + footer) applies to every public page.
  **S5-T1/T2** (pagination + "claim this rank"): homepage now `.range()`-paginated 50/page —
  became a dynamic route (searchParams-driven, no longer ISR-static) as an expected/accepted
  consequence, same as the admin listings page. Every row + an above-#1 slot link to
  `/submit?amount=X`.
  **S5-T3** (`/categories`, `/category/[slug]`): category counts via `Promise.all` of 21
  `{count:"exact", head:true}` queries rather than an unverified PostgREST grouped-aggregate select.
  **S5-T4** (`/rules`, `/about`): `/rules` fully data-driven from `settings`; `/about` ships with
  only spec-derivable mechanic copy — company narrative is an explicit TODO placeholder, not
  fabricated, per explicit user instruction.
  **S5-T5** (top-up UI): confirmed F10's backend was already fully correct from Sprint 2 — this
  task was just the route move + one copy line acknowledging the top-up flow; no new backend logic,
  no redundant "this is your listing" link (impossible to know pre-lookup with no accounts).
  **S5-T6** (activity feed): last 15 confirmed bids joined to listings, homepage only.
  **S5-T7** ("N online"): new `online_heartbeats` table (additive migration), 15s client ping /
  45s online window, self-built — no vendor.
  **S5-T9** (click tracking): new `listing_clicks` table (additive migration, no PII), every public
  listing link now routes through `app/out/[id]/route.ts` (records the click, then redirects with
  UTM params) instead of linking straight to `display_url`; admin's own listings-page link
  deliberately left untouched (internal review tool, not a public tracked click).
  **S5-T8 (revenue counter) explicitly NOT built this round** — user instruction: don't surface
  total revenue on the frontend in this phase. No query, no component, no footer wiring for it yet.
  Verified live against the real Supabase DB: seeded 55 test listings to confirm exact 50/50/8
  page-1/page-2 pagination boundaries and fixed ordering, then cleaned up; category filtering and
  21-category counts; `/rules` reflecting live settings; the `/out/[id]` redirect (valid → correct
  UTM redirect + exactly one `listing_clicks` row; invalid uuid and non-approved/nonexistent id →
  safe redirect home, zero rows); online counter live (heartbeat POSTs succeeding, count reflected
  in the footer); `/submit`, `/submit/pending`, and all of `/admin/**` unaffected by the route move.
  Lint/typecheck/`npm test`(14/14)/`npm run build` all pass.
- 2026-08-24 · Admin listings management + Resend email notifications (not sprint tasks — user
  request; confirmed via feature-spec.md/tech-spec.md/all sprint files that neither was previously
  specified anywhere, planned via /plan mode with 4 clarifying questions resolved first) ·
  **Listings management** (`/admin/listings`): search (URL/identity/email, one box via `.or()`
  ILIKE), filter (category, status: approved/rejected/unpublished), pagination (20/page), edit
  category, unpublish/republish — everything except brand-new-listing creation, which stays
  payment-gated by design (confirmed with user). New `unpublished` status
  (`supabase/migrations/20260824_listings_unpublish.sql`, additive, applied to production with
  user confirmation) plus its own `unpublished_by`/`unpublished_at` columns, deliberately separate
  from `reviewed_by`/`reviewed_at` so an unpublish action never overwrites the original
  approve/reject audit record; republish clears them back to `null` rather than keeping history
  (see Decisions). New routes `app/api/admin/listings/[id]/{category,unpublish,republish}`, same
  `requireAdminApi("admin")` + status-guarded-`.update()` pattern as existing approve/reject.
  **Resend notifications** (`lib/email/notify.ts`, plain `fetch`, no SDK — see Decisions): fires at
  both submit-time (brand-new listings only, never top-ups) and payment-confirm-time (when a
  listing reaches `paid_pending_review`), to one fixed address via 3 new env vars
  (`RESEND_API_KEY`/`ADMIN_NOTIFICATION_EMAIL`/`RESEND_FROM_EMAIL`) — all silently no-op if unset,
  and every call site wraps the send in try/catch so a Resend failure can never block a submission
  or payment confirmation (verified live: both routes still return 200 with correct DB state with
  the env vars unset, only a `console.error`). Verified live end-to-end against the real Supabase
  DB: category edit persists without touching `amount`/`status`; unpublish removes a listing from
  the public homepage immediately, republish restores it and clears the unpublish columns;
  search/filter/status-switch all correct. Test rows cleaned up afterward. Lint/typecheck/
  `npm test`(14/14)/`npm run build` all pass.
- 2026-08-24 · Admin UI: top-nav → left sidebar (not a sprint task — user asked after reviewing
  Sprint 4's UI as "too rough") · Mocked with the `design` skill first, approved, then implemented:
  `app/admin/(protected)/sidebar-nav.tsx` (brand + nav, active-state via `usePathname`) and
  `account-menu.tsx` (avatar/email/role/logout, replaces the old `logout-button.tsx`) replace the
  old horizontal top bar in `layout.tsx`. Session token now carries `email` (added to
  `lib/auth/session.ts`'s payload and `app/api/admin/login/route.ts`) so the sidebar can show it
  without an extra DB query per page load — old pre-change session cookies don't have it, so
  existing logins needed to re-authenticate once. Role-gating logic itself untouched (same
  `session.role === "super_admin"` check, already verified in Sprint 4). Verified live: nav
  active-state switches correctly between `/admin` and `/admin/settings`, logout works. Lint/
  typecheck/`npm test`(14/14)/`npm run build` all pass.
- 2026-08-24 · Sprint 4 done (S4-T1 through S4-T5) · Admin auth (`lib/auth/{password,session,
  require-admin}.ts`, `app/api/admin/{login,logout}`, `app/admin/login`) — stateless HMAC-signed
  httpOnly session cookie (no sessions table, `ADMIN_SESSION_SECRET`), argon2id via
  `@node-rs/argon2` (picked over the native-binding `argon2` package for reliable Vercel builds).
  First `super_admin` (`ntkhang@gmail.com`) seeded via `scripts/seed-admin.mjs`, a one-off script
  with no public sign-up path. Role enforcement (`requireAdminPage`/`requireAdminApi`) is shared by
  every admin page and route; verified a plain `admin` session gets a real HTTP 403 on both
  `/admin/settings` (via Next's `forbidden()`, needed enabling `experimental.authInterrupts` in
  `next.config.ts`) and the underlying `POST /api/admin/settings`, not just a hidden nav link.
  Pending-review queue (`app/admin/(protected)/page.tsx`) lists `paid_pending_review` listings with
  an editable category dropdown; approve/reject actions
  (`app/api/admin/listings/[id]/{approve,reject}`) require a non-empty reason to reject and log
  who/when via two new `listings` columns (`reviewed_by`, `reviewed_at` — additive migration
  `20260824_listings_review_audit.sql`, applied to production with user confirmation) rather than a
  separate audit table, since only the latest review matters here. Settings page
  (`app/admin/(protected)/settings`) edits `starting_price`/`min_increment`/`vat_percent`
  (super_admin only), uses sonner toast for save feedback per CLAUDE.md's convention. Verified live
  against the real Supabase DB end-to-end: login/logout/wrong-password/unauthenticated-redirect;
  approve (category correction persists, listing appears on the public homepage immediately);
  reject (empty-reason blocked client-side, reason persisted, listing never appears publicly);
  settings save takes effect immediately for new submissions without touching existing listings'
  `amount`; plain-admin 403 on both settings surfaces. All test rows/accounts cleaned up
  afterward, production settings restored to their original values. Lint/typecheck/`npm test`
  (14/14)/`npm run build` all pass. **Known gap, not fixed:** deleting/demoting an admin doesn't
  invalidate their already-issued session token (stateless cookie, no revocation list) — it stays
  valid until its 24h expiry. Acceptable for a small fixed set of trusted admins; would need
  revisiting if that assumption changes.
- 2026-08-24 · Interim mock payment step (not a numbered sprint task — unblocks demoing the submit
  flow before Sprint 3's real gateway exists) · Added `app/api/payments/mock-confirm/route.ts`, the
  only new caller of `increment_listing_amount()` besides the future gateway webhook — the submit
  form and `/submit/pending` still never touch `listings.amount` directly, matching CLAUDE.md's
  rank-integrity rule. `/submit/pending` (now a client component, `pending-confirm.tsx`) auto-fires
  the mock confirm on load instead of the old static placeholder text. Per explicit user decision,
  this mock always "succeeds" and is **not** gated to non-production — it is reachable on the live
  Vercel deployment too; see Decisions and Blockers. While verifying live against the real Supabase
  DB, caught and fixed a real bug: `increment_listing_amount()` returned `permission denied`
  (`42501`) for every call made the way real callers actually call it (via `service_role` through
  supabase-js) — the init migration's `revoke all ... from public, anon, authenticated` had silently
  stripped `service_role`'s implicit PUBLIC-granted EXECUTE too, and nothing re-granted it. Never
  caught before because S1's only test of this function (`scripts/verify-atomic-increment.mjs`) used
  a direct `pg` connection as the `prisma` role, not the app's real path. Fixed with an additive
  migration, `supabase/migrations/20260824_grant_rank_engine_execute.sql`
  (`grant execute ... to service_role`), applied to production with user confirmation. Verified live:
  new-listing submit → mock-confirm → `amount`/`first_confirmed_at`/`status` (`paid_pending_review`)
  all correct; reloading the confirm step is a no-op (idempotent, `updated_at` unchanged); the failed
  first attempt (pre-fix) left its bid `pending` with zero listing write — no partial state; homepage
  correctly still excludes the unapproved test listing. Test rows cleaned up afterward. Lint/
  typecheck/`npm test` (14/14) all pass.
- 2026-08-24 · Sprint 2 done (S2-T1 through S2-T5) · `lib/normalize-identity.ts`,
  `lib/content-validation.ts`, `lib/categorize.ts`, `/submit` page + form, `/api/listings/{lookup,
  classify,submit}`. Caught a real bug during S2-T1's own tests: Play Store differentiates apps via
  `?id=`, not path — fixed before it ever shipped. Verified the entire flow live against the real
  Supabase DB (not mocks): new listing creation, below-minimum rejection, banned-link (Telegram)
  rejection, top-up on an existing listing (same `listings.id`, second `bids` row, `amount` still
  untouched pre-payment), and mismatched-email rejection. All test rows cleaned up afterward.
  20/20 unit tests pass, lint/typecheck clean. One piece unverified: S2-T4's actual Claude API
  response — `ANTHROPIC_API_KEY` isn't set (see Blockers); the code's fallback-to-"other" path is
  what's been exercised so far, not a real classification.
- 2026-08-24 · S1-T7 done, Sprint 1 complete · User connected the GitHub repo to Vercel, added
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` as Vercel
  env vars. Production build of commit `cd3b8ae` succeeded (Next.js 16.3.2/Turbopack, TypeScript
  check passed, page data collection against the real Supabase DB succeeded). All of Sprint 1's
  Definition of Done items are met except final user review.
- 2026-08-24 · Repushed to GitHub with corrected commit authorship · user deleted and recreated
  `github.com/ntkhanghub/bidtop`, then asked to rewrite all 5 existing local commits' author from
  `ntkhang888@gmail.com` to `ntkhang@gmail.com` before the first push (safe — nothing had been
  shared yet at the time... except origin/master turned out to already have identical content,
  apparently pushed independently via another session/device, e.g. Remote Control on mobile).
  Confirmed via `git fetch` before touching anything. Rewrote all 5 commits with
  `git rebase --root --exec 'git commit --amend --author=...'`, then `git push --force` after
  explicit confirmation (force-push flagged and confirmed separately, since it overwrote existing
  remote content). `origin/master` now matches local exactly, all commits show
  `Khang Nguyen <ntkhang@gmail.com>` as both author and committer.
- 2026-08-24 · S1-T6 re-verified against supabase-js data layer · Fixed missing GRANT statements in
  `20260823_init.sql` (tables created by `prisma` role weren't accessible to `service_role` —
  added `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role` and `GRANT SELECT ON
  categories, listings, settings TO anon, authenticated`). Re-applied migration + seed. `npm test`,
  `npm run build` (ISR revalidate:30s confirmed), `npm run lint`, `npm run typecheck` all pass.
  Live browser: homepage shows empty-state "Chưa có listing nào được duyệt" from real Supabase DB.
  Not yet committed.
- 2026-08-23 · Data layer switched Prisma → `@supabase/supabase-js` (mid-Sprint-1 pivot; see
  Decisions for the reasoning) · Rebuilt from scratch: `supabase/migrations/20260823_init.sql`
  (raw SQL — tables, enums, indexes, RLS policies, `increment_listing_amount()` RPC function with
  `EXECUTE` revoked from anon/authenticated) applied via `scripts/apply-migration.mjs`;
  `supabase/seed.sql` applied via `npm run db:seed`; `lib/supabase/server.ts` (service-role client)
  + `lib/supabase/database.types.ts` (hand-written `Database` type — hit and fixed a real bug here:
  postgrest-js's `GenericSchema`/`GenericTable` types require `Views` and `Relationships` keys even
  when empty, or `.select()` silently infers `never`); `app/page.tsx` rewritten against the new
  client. Removed `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg` (moved to devDependency,
  now dev-tooling-only), `prisma.config.ts`, `prisma/` entirely. Verified for real, not just
  typechecked: `scripts/verify-atomic-increment.mjs` fired 8 concurrent RPC calls at one listing
  and confirmed the final amount was the exact sum of all deltas (no lost update) — the single most
  important correctness property in the whole system. `npm run lint`/`typecheck` clean.
  `npm test`/`npm run build`/live-browser homepage check still pending — need
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` from the
  user (`DATABASE_URL`/`DIRECT_URL` alone, which we have, aren't enough — those only feed the dev
  migration script now, not the app). Not yet committed.
- 2026-08-23 · S1-T3 re-verified on the Singapore project · user recreated the Supabase project in
  `ap-southeast-1` (project ref `fugvcufgrpnnanqxmvrs`, replacing the Seoul one). Same pooler
  hostname gotcha hit again, this time with two candidate clusters (`aws-0-` and `aws-1-` both
  resolved via DNS) — tried `aws-0-ap-southeast-1.pooler.supabase.com` first and it was correct.
  `migrate dev`, `db seed`, `npm test`, `npm run build`, and live-browser homepage check all
  re-run clean against the new DB.
- 2026-08-23 · S1-T3/T4/T5/T6 done (Seoul, superseded above) · Real Supabase project connected. Fixed a wrong pooler
  hostname along the way (missing `aws-0-` prefix — see Decisions). `prisma migrate dev` applied
  migration `20260823073758_init` cleanly; `prisma db seed` inserted 21 categories + 3 settings;
  homepage verified live in-browser showing the real DB-sourced empty state; `npm run build`
  succeeds with ISR `revalidate: 30s` confirmed in the build output. Not yet committed (env file
  itself is gitignored as expected; migration SQL + doc updates pending commit).
- 2026-08-23 · S1-T4 (partial: schema only) · `prisma/schema.prisma` written for
  categories/listings/bids/settings/admin_users per tech-spec; validated with `prisma
  validate`/`generate` against a placeholder `.env`. Commit `9833000`.
- 2026-08-23 · S1-T5 (partial: script only) · `prisma/seed.ts` written with the 21 categories +
  default settings. Commit `9833000`.
- 2026-08-23 · S1-T6 (partial: code only) · `app/page.tsx` queries
  `listings WHERE status = 'approved' ORDER BY amount DESC, firstConfirmedAt ASC` with an empty
  state, `revalidate = 30` (ISR). Commit `9833000`.
- 2026-08-23 · S1-T2 done · CLAUDE.md Commands section updated to the real, verified commands
  (dev/build/lint/typecheck/test/format/prisma generate/migrate dev/db seed). Commit `9833000`.
- 2026-08-23 · S1-T1 done · Scaffolded with Next.js 16.3.2 + Tailwind v4 + sonner + Vitest +
  Prettier; merged into repo root, `git init`, first commit. Verified live in-browser (not just
  lint/typecheck): Tailwind computed styles applied, test toast fired and rendered. Commit
  `9833000`.

## Decisions
<!-- Date · decision · why, one line each. Deviations from the specs are recorded here AND
reflected back into the spec file. -->
- 2026-08-26 · Sprint 3 ships against ZaloPay's production API directly, no sandbox toggle in code
  · user confirmed only a production ZaloPay Gateway account exists for this merchant, no separate
  sandbox credentials. Adding a `ZALOPAY_ENV`/sandbox-vs-production env toggle would be speculative
  complexity for an environment that doesn't exist for this account (CLAUDE.md's simplicity-first
  principle) — trivial to add back if sandbox access is ever obtained.
- 2026-08-26 · ZaloPay checkout is QR/ZaloPay-wallet only (`bankcode="zalopayapp"`, fixed, not a
  runtime setting) · user's explicit choice over showing every supported bank/card option
  (`bankcode=""`). One-line change in `lib/payment/zalopay.ts` if card payment is wanted later.
- 2026-08-26 · No PII sent to ZaloPay's `createorder` call — `appuser` is the bid's own id, not
  `submitter_email`; `email`/`phone`/`address` fields left empty · user's explicit choice, matching
  CLAUDE.md's conservative existing stance on `submitter_email`.
- 2026-08-26 · `confirm_bid_and_increment()` (new combined RPC) replaces the two-separate-calls
  pattern for the real webhook — see the 2026-08-26 task log entry above for the race it closes.
  `increment_listing_amount()` stays in place (additive-only), used only by the temporary mock until
  it's deleted.
- 2026-08-26 · Webhook testing during development uses a Vercel preview deploy's public URL
  (registered temporarily as the ZaloPay callback URL), not a local tunnel · user's explicit choice;
  simpler than installing/running ngrok or similar, and this repo already deploys to Vercel on every
  push.
- 2026-08-26 · **Supersedes/closes** the 2026-08-24 "9Pay→ZaloPay rename deliberately deferred until
  Sprint 3 begins" decision below — Sprint 3 has now begun; every 9Pay/`NINE_PAY_*` reference in
  CLAUDE.md/tech-spec.md/feature-spec.md/the sprint files/.env.example has been updated (see the
  2026-08-26 task log entry).
- 2026-08-25 · "N online" (F12) stays self-built (Postgres heartbeat table), no third-party vendor
  · user initially wanted Vemetric.com; verified via their real API docs that they have no
  purpose-built live-count endpoint (only historical/windowed analytics queries) and integrating
  would require a new client-side SDK — both facts, plus the existing "no third-party analytics
  vendor in the MVP" non-goal already in CLAUDE.md/tech-spec.md, made the self-built design the
  better call. User agreed after being shown the research. No spec-file changes needed.
- 2026-08-25 · S5-T8 (footer revenue counter) intentionally not built this round · explicit user
  instruction — don't surface total revenue on the frontend in this phase. Revenue query/component
  will be a small, self-contained follow-up whenever asked; nothing in this round blocks it.
- 2026-08-24 · Resend calls go through plain `fetch`, no `resend` npm package · CLAUDE.md: "no new
  dependency for something under ~20 lines" — the send call is one `fetch` to Resend's REST API;
  overridable later without changing call sites if the SDK's typed responses/retries are wanted.
- 2026-08-24 · Republishing an unpublished listing clears `unpublished_by`/`unpublished_at` back to
  `null` rather than keeping them as history · `reviewed_by`/`reviewed_at` already own the
  permanent audit record (per S4-T4's "most recent review only" call below); a currently-`approved`
  row showing a stale "unpublished by X" would be confusing. A full audit trail, if ever wanted,
  needs a real log table.
- 2026-08-24 · Admin sessions are a stateless HMAC-signed httpOnly cookie, no `admin_sessions`
  table · tech-spec only said "session cookie", didn't specify storage; matches "small, fixed set
  of admin accounts, no managed auth provider" already decided. Trade-off: no way to force-revoke a
  session early (see Blockers) — acceptable for now, would need a real store if that changes.
- 2026-08-24 · argon2id via `@node-rs/argon2`, not the `argon2` npm package · both implement
  argon2id (CLAUDE.md's required scheme), but `@node-rs/argon2` ships prebuilt napi-rs binaries
  instead of compiling a native addon via node-gyp at install time — meaningfully lower risk on
  Vercel's build image. Confirmed Argon2id is its default algorithm (no explicit option needed).
- 2026-08-24 · S4-T4's "who/when" audit requirement is 2 columns on `listings`
  (`reviewed_by`/`reviewed_at`), not a separate audit-log table · the moderation queue only ever
  needs the most recent review, not full history; a dedicated table would be unused complexity for
  what F8 actually asks for.
- 2026-08-24 · **Supersedes the entry below** — Payment gateway switched to ZaloPay (real
  integration deferred, to be done when Sprint 3 actually starts) · user's explicit call, no reason
  given beyond preferring ZaloPay over 9Pay. Not yet reflected in tech-spec.md/CLAUDE.md's 9Pay
  references (env var names, `app/api/webhooks/9pay/` path, etc.) — deliberately left as-is until
  Sprint 3 begins, since the exact ZaloPay merchant contract (S3-T1's job) isn't known yet and a
  premature rename would just be churn.
- 2026-08-24 · Interim mock payment step added ahead of Sprint 3, deliberately left ungated (works
  in production, not just dev) · user's explicit choice after being warned this means anyone who can
  reach the live bidtop.vn can rank up without paying — accepted as a temporary, pre-launch-only
  risk. Must be deleted (`app/api/payments/mock-confirm/`, the auto-fire in
  `app/submit/pending/pending-confirm.tsx`) once Sprint 3's real ZaloPay webhook lands — see
  Blockers.
- 2026-08-23 · **Superseded above** — Payment gateway = 9Pay (not VNPay/Momo/ZaloPay/Stripe) · team
  already has a working integration on ContentSuper.com.
- 2026-08-23 · Guest checkout only (no user accounts) for MVP · matches outbid.lol's model,
  minimizes friction.
- 2026-08-23 · New listings require manual admin approval before appearing publicly; top-ups on
  already-approved listings do not · balances content safety against the "pay = rank now" value
  prop, since content only needs vetting once.
- 2026-08-23 · Starting price 100,000đ, minimum increment 50,000đ, VAT 8% added at checkout on top
  of the ranked amount · configurable at runtime by super_admin via Settings, not hardcoded.
- 2026-08-23 · Launch category list finalized at 21 categories (see
  `docs/sprints/sprint-01-foundation.md` S1-T5) · corrected from an initial "19" mislabel during
  kickoff — the itemized list the user approved actually totals 21.
- 2026-08-23 · Database = Supabase Postgres (not Neon) · user's explicit choice; only its Postgres
  product is used, not Auth/Storage/Realtime. Still true after the later Prisma → supabase-js
  switch below — this decision was about the *database*, not the client library.
- 2026-08-23 · Styling = Tailwind CSS, transient feedback = toast notifications (sonner chosen as
  the default library, swappable) · user's explicit choice.
- 2026-08-23 · "Claim this rank for X" pricing shortcut added (F1, S5-T2) · user shared an
  outbid.lol screenshot showing this exact UI pattern: clicking a leaderboard row pre-fills
  `/submit`'s amount with that row's current amount + `min_increment`. Also resolves the earlier
  open question about a special higher threshold for rank #1 — confirmed there isn't one; #1 uses
  the same formula as any other rank.
- 2026-08-23 · Manual admin review reconfirmed for new listings (not reverting to outbid.lol's
  instant-publish) · user's explicit call — avoids the platform being blindsided by
  politically-sensitive content going live unreviewed. F6/F8 unchanged, no spec edit needed.
- 2026-08-23 · Scaffolded with Next.js 16 (not 15) and Tailwind v4 (not v3) · both were "latest
  stable" at scaffold time; tech-spec always intended boring/latest, not a hard version pin.
  CLAUDE.md and tech-spec.md updated to match. No `tailwind.config.ts` exists — v4 doesn't need
  one for this project.
- 2026-08-23 · **Superseded** — Prisma 7's schema.prisma no longer accepts `url`/`directUrl` in the
  datasource block · was true and relevant while Prisma was in use (S1-T3 era); moot after the
  Prisma → supabase-js switch further down this list. Left here only as a record of what was
  investigated at the time.
- 2026-08-23 · Homepage (`app/page.tsx`) uses ISR (`revalidate = 30`), not pure static or
  force-dynamic · matches tech-spec's NFR ("leaderboard renders < 1s on the cached path") while
  keeping listings reasonably fresh after a payment. Means `npm run build` needs a real DB
  connection to prerender `/` — expected, not a bug.
- 2026-08-23 · Supabase DB role = dedicated `prisma`-named role (not default `postgres`
  superuser), kept as dev-tooling role after the Prisma → supabase-js switch · originally followed
  Supabase's official Prisma integration guide (least privilege); the name is now a legacy
  artifact but the role itself is still correct for `scripts/apply-migration.mjs`'s job. Created
  with `bypassrls` explicitly, so it's unaffected by "Automatic RLS on new tables" either way.
- 2026-08-23 · Supabase project recreated in `ap-southeast-1` (Singapore) · resolves the earlier
  Seoul-vs-Singapore open question — user chose to switch. No real data existed yet, so the old
  Seoul project's data was simply abandoned, not migrated.
- 2026-08-23 · Fixed wrong Supabase pooler hostname (twice — Seoul project, then Singapore
  project) · `[region].pooler.supabase.com` doesn't resolve (NXDOMAIN) — needs a pooler cluster
  prefix, e.g. `aws-0-[region].pooler.supabase.com`. **The cluster number isn't always `aws-0`** —
  on the Singapore project both `aws-0-ap-southeast-1` and `aws-1-ap-southeast-1` resolved via DNS
  as distinct clusters; `aws-0` happened to be the correct one for this project, verified by
  actually connecting, not assumed. If a future project's connection fails the same way, check
  both. `.env.example` corrected to flag this explicitly.
- 2026-08-23 · **Data access layer switched from Prisma to `@supabase/supabase-js`, entirely
  replacing the ORM** · user's explicit, informed choice — asked directly after Prisma was already
  built, working, and verified against a live DB in Sprint 1. Before agreeing to touch anything,
  walked through why the project originally chose direct-Postgres-via-server over
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` + client-side Supabase SDK (the anon-key pattern shifts all
  enforcement onto RLS policies the browser can reach directly; a direct server-only connection
  means the browser never holds any DB-reaching credential at all — stronger default for an app
  with a password-hash table and a payment ledger) — user acknowledged this and asked to switch
  anyway, then picked the most disruptive of 4 offered scoping options ("replace Prisma entirely")
  over 3 narrower ones (keep Prisma + add anon key for one feature; server-only Supabase SDK
  without any anon key/RLS surface at all; do nothing).
  **What changed:** raw SQL migrations (`supabase/migrations/`) applied by a small local script
  instead of `prisma migrate`; hand-written TS types instead of Prisma-generated ones; the atomic
  rank-engine write became a Postgres RPC function (`increment_listing_amount`, `EXECUTE` revoked
  from anon/authenticated) instead of Prisma's `increment()` inside a `$transaction`; RLS enabled
  on every table with exactly 3 narrow public read policies (categories, approved listings,
  settings) — everything else (all writes, `bids`, `admin_users`) has zero policies, reachable only
  via `service_role` from server code.
  **What did NOT change:** the security model itself. All app traffic — including the public
  homepage — still goes through `service_role` server-side; `NEXT_PUBLIC_SUPABASE_ANON_KEY` is
  configured (as the user asked) but nothing calls it yet, so it grants nothing in practice today.
  The browser still never holds a credential that reaches the database. RLS exists as a second,
  currently-mostly-inert layer in case that ever changes by accident, not because the app relies on
  it today.

## Blockers & open questions
<!-- Anything a session had to stop on, waiting for user input. -->
- `ANTHROPIC_API_KEY` not set in `.env` — needed to verify S2-T4's category classifier (`lib/
  categorize.ts`) against a real Claude response. Not launch-blocking for Sprint 2 itself (the code
  gracefully falls back to `"other"` without it, and F5's design already treats classifier
  correctness as non-critical since admin corrects it at approval), but should be resolved before
  trusting the suggestion quality in a real demo.
- **`ZALOPAY_APP_ID`/`ZALOPAY_KEY1`/`ZALOPAY_KEY2` not yet in `.env`** — the user has registered a
  ZaloPay Gateway merchant account but hasn't added the credentials to `.env` yet (add them
  directly, not pasted into chat, per CLAUDE.md's secrets rule). Blocks S3-T1's live verification
  and every other live-verification step in Sprint 3's Next task above.
- **`supabase/migrations/20260826_confirm_bid_and_increment.sql` written but not applied** to the
  production DB — needs `DIRECT_URL` (already set) and explicit user confirmation before running,
  same as every prior migration in this project.
- The mock payment step (`app/api/payments/mock-confirm/`) is still live in production and always
  "succeeds" with no real charge — a real free-rank exploit until Sprint 3's real flow is
  live-verified and this file is deleted (its call site in `pending-confirm.tsx` is already rewired
  to the real flow, but the mock endpoint itself is still reachable). Must not be forgotten before
  any real launch/marketing push.
- bidtop.vn domain/trademark availability not yet confirmed — must resolve before Sprint 6.
- Legal review of "Dịch vụ pháp lý" and "Crypto, Web3 & Investing" categories not started — both
  stay out of the product indefinitely until done (no sprint assigned).
