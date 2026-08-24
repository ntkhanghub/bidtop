# Progress

Single source of truth for project status. Every session updates this file after each completed
task; no session starts work without reading it.

**Current sprint:** Sprint 4 — Admin panel & moderation (done — awaiting user review). Built ahead
of Sprint 3's real payment gateway, using the interim mock-payment step (see task log below) to
satisfy Sprint 4's dependency on real `paid_pending_review` rows.
**Next task:** awaiting user direction — either S3-T1 (real ZaloPay integration, still not started)
or Sprint 5 (public leaderboard & growth). Sprint 3's real gateway work remains the one thing
standing between this app and a safe public launch (see Blockers).

## Sprint status

| # | Sprint | Status | Started | Finished |
|---|--------|--------|---------|----------|
| 1 | Foundation | Done | 2026-08-23 | 2026-08-24 |
| 2 | Listing submission & identity normalization | Done | 2026-08-24 | 2026-08-24 |
| 3 | Payment integration & atomic rank engine | Not started (real gateway deferred; interim mock unblocks Sprint 4) | — | — |
| 4 | Admin panel & moderation | Done | 2026-08-24 | 2026-08-24 |
| 5 | Public leaderboard & growth features | Not started | — | — |
| 6 | Hardening & launch | Not started | — | — |

## Task log
<!-- Newest first. One line: date · task ID · outcome · commit/PR if any -->
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
- ZaloPay merchant credentials/account not yet set up — must resolve before Sprint 3's S3-T1 (was
  the 9Pay version of this same open question; moot now per the gateway-switch Decision above).
- The mock payment step (`app/api/payments/mock-confirm/`) is live in production and always
  "succeeds" with no real charge — a real free-rank exploit until Sprint 3 replaces it with the
  ZaloPay webhook. Must not be forgotten before any real launch/marketing push.
- bidtop.vn domain/trademark availability not yet confirmed — must resolve before Sprint 6.
- Legal review of "Dịch vụ pháp lý" and "Crypto, Web3 & Investing" categories not started — both
  stay out of the product indefinitely until done (no sprint assigned).
