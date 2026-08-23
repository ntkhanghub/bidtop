# Progress

Single source of truth for project status. Every session updates this file after each completed
task; no session starts work without reading it.

**Current sprint:** Sprint 1 — Foundation
**Next task:** S1-T3 (blocked — needs real Supabase project credentials from the user, see
Blockers below; S1-T1 and S1-T2 are done)

## Sprint status

| # | Sprint | Status | Started | Finished |
|---|--------|--------|---------|----------|
| 1 | Foundation | In progress | 2026-08-23 | — |
| 2 | Listing submission & identity normalization | Not started | — | — |
| 3 | Payment integration & atomic rank engine | Not started | — | — |
| 4 | Admin panel & moderation | Not started | — | — |
| 5 | Public leaderboard & growth features | Not started | — | — |
| 6 | Hardening & launch | Not started | — | — |

## Task log
<!-- Newest first. One line: date · task ID · outcome · commit/PR if any -->
- 2026-08-23 · S1-T4 (partial: schema only) · `prisma/schema.prisma` written for
  categories/listings/bids/settings/admin_users per tech-spec; validated with `prisma
  validate`/`generate` against a placeholder `.env`. Not yet migrated against a real DB — same
  blocker as S1-T3. Commit `9833000`.
- 2026-08-23 · S1-T5 (partial: script only) · `prisma/seed.ts` written with the 21 categories +
  default settings; not yet run against a real DB. Commit `9833000`.
- 2026-08-23 · S1-T6 (partial: code only) · `app/page.tsx` queries
  `listings WHERE status = 'approved' ORDER BY amount DESC, firstConfirmedAt ASC` with an empty
  state, `revalidate = 30` (ISR). `npm run build` currently fails against the placeholder `.env`
  (expected — it tries to prerender against a real DB connection); will pass once real Supabase
  credentials are set. Commit `9833000`.
- 2026-08-23 · S1-T2 done · CLAUDE.md Commands section updated to the real, verified commands
  (dev/build/lint/typecheck/test/format/prisma generate/migrate dev/db seed). Commit `9833000`.
- 2026-08-23 · S1-T1 done · Scaffolded with Next.js 16.3.2 + Tailwind v4 + sonner + Vitest +
  Prettier; merged into repo root, `git init`, first commit. Verified live in-browser (not just
  lint/typecheck): Tailwind computed styles applied, test toast fired and rendered. Commit
  `9833000`.

## Decisions
<!-- Date · decision · why, one line each. Deviations from the specs are recorded here AND
reflected back into the spec file. -->
- 2026-08-23 · Payment gateway = 9Pay (not VNPay/Momo/ZaloPay/Stripe) · team already has a working
  integration on ContentSuper.com.
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
  product is used, not Auth/Storage/Realtime. Requires both `DATABASE_URL` (pooled) and
  `DIRECT_URL` (direct) env vars for Prisma to work correctly (see S1-T3).
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
- 2026-08-23 · Prisma 7's schema.prisma no longer accepts `url`/`directUrl` in the datasource
  block · CLI connection config (`DIRECT_URL`) moved to `prisma.config.ts`; the runtime
  `PrismaClient` now requires an explicit driver adapter (`@prisma/adapter-pg`, reading
  `DATABASE_URL`) instantiated in `lib/db.ts`. Both env vars are still needed, just wired in two
  different files instead of one. tech-spec.md and CLAUDE.md updated to match.
- 2026-08-23 · Homepage (`app/page.tsx`) uses ISR (`revalidate = 30`), not pure static or
  force-dynamic · matches tech-spec's NFR ("leaderboard renders < 1s on the cached path") while
  keeping listings reasonably fresh after a payment. Means `npm run build` needs a real DB
  connection to prerender `/` — expected, not a bug.

## Blockers & open questions
<!-- Anything a session had to stop on, waiting for user input. -->
- **Blocking Sprint 1 right now:** need a real Supabase project (Singapore region) — the pooled
  connection string (port 6543) for `DATABASE_URL` and the direct one (port 5432) for
  `DIRECT_URL`. Without these, S1-T3 through S1-T7 cannot be verified against a real database
  (schema/seed/homepage code is written and typechecks, but is unverified against Postgres), and
  `npm run build` will keep failing. Creating the Supabase account/project is the user's to do —
  see CLAUDE.md Prohibited-actions equivalent (account creation).
- Vercel account/project not yet connected — needed for S1-T7. Also the user's to set up
  (connecting a GitHub repo to Vercel, or `vercel login`), unless they'd rather hand over a
  `VERCEL_TOKEN` for CLI-driven deploys.
- 9Pay merchant credentials: new account for BidTop.vn, or reuse ContentSuper.com's? Must resolve
  before Sprint 3 (see tech-spec.md Open questions).
- bidtop.vn domain/trademark availability not yet confirmed — must resolve before Sprint 6.
- Legal review of "Dịch vụ pháp lý" and "Crypto, Web3 & Investing" categories not started — both
  stay out of the product indefinitely until done (no sprint assigned).
