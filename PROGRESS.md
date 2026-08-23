# Progress

Single source of truth for project status. Every session updates this file after each completed
task; no session starts work without reading it.

**Current sprint:** Sprint 1 — Foundation
**Next task:** S1-T1

## Sprint status

| # | Sprint | Status | Started | Finished |
|---|--------|--------|---------|----------|
| 1 | Foundation | Not started | — | — |
| 2 | Listing submission & identity normalization | Not started | — | — |
| 3 | Payment integration & atomic rank engine | Not started | — | — |
| 4 | Admin panel & moderation | Not started | — | — |
| 5 | Public leaderboard & growth features | Not started | — | — |
| 6 | Hardening & launch | Not started | — | — |

## Task log
<!-- Newest first. One line: date · task ID · outcome · commit/PR if any -->

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

## Blockers & open questions
<!-- Anything a session had to stop on, waiting for user input. -->
- 9Pay merchant credentials: new account for BidTop.vn, or reuse ContentSuper.com's? Must resolve
  before Sprint 3 (see tech-spec.md Open questions).
- bidtop.vn domain/trademark availability not yet confirmed — must resolve before Sprint 6.
- Legal review of "Dịch vụ pháp lý" and "Crypto, Web3 & Investing" categories not started — both
  stay out of the product indefinitely until done (no sprint assigned).
