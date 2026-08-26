# Sprint 6 — Hardening & launch

**Goal:** BidTop.vn is safe against the abuse cases that matter for a payment-driven public
directory, and is live on the real domain with ZaloPay's callback pointed at it.

**Demo criteria:** At the end of this sprint the product is reachable at bidtop.vn, a real payment
end to end works against that production domain, spam/abuse guardrails are in place, and every
item in this sprint's checklist is verifiably done — not just believed done.

## In scope
- Security pass against `CLAUDE.md`'s safety rules
- Error/empty states
- Rate limiting and abuse prevention
- Legal/compliance checklist for launch
- Production deploy to bidtop.vn

## Out of scope
- Any new F-numbered feature — this sprint hardens what Sprints 1–5 already built

## Tasks

### S6-T1 — Webhook security review
Re-verify S3-T4's mac validation against edge cases (missing fields, replayed old payloads,
malformed macs); confirm the `return_url` route (S3-T3) still performs zero writes.
**Acceptance:** a written (even brief) checklist confirming each case was tested, attached to the
PR/commit for this task.

### S6-T2 — Rate limiting on submission endpoint
Add rate limiting to `/submit` and the top-up path to prevent spam/abuse (e.g. scripted repeated
submissions).
**Acceptance:** exceeding a defined threshold from one source returns a clear rate-limit response
instead of creating more `draft`/`pending` rows.

### S6-T3 — Error and empty states
Audit every user-facing flow (submit, checkout, top-up, admin queue, leaderboard) for a real error
state: payment failure, ZaloPay timeout, empty leaderboard/category, empty admin queue.
**Acceptance:** manually triggering each failure case (e.g. cancel a ZaloPay checkout) shows a
specific, non-crashing message — no raw stack traces or blank pages.

### S6-T4 — Content compliance checklist
Confirm: no "Dịch vụ pháp lý" or "Crypto, Web3 & Investing" category exists anywhere in the seeded
data or UI; banned-link validation (S2-T2) is active on every submission path including top-ups;
`/rules` (S5-T3) accurately reflects actual enforced behavior.
**Acceptance:** a written checklist, each item verified against the running production build, not
just the code.

### S6-T5 — ZaloPay callback re-pointed at the final domain
Sprint 3 already runs against ZaloPay's production API (no sandbox exists for this merchant
account) — this task re-registers the IPN callback URL in the ZaloPay merchant dashboard from
whatever Vercel preview URL was used during Sprint 3's testing to the final `https://bidtop.vn`,
and re-verifies with one more real, small end-to-end payment on production infrastructure.
**Acceptance:** a real payment (smallest possible amount) completes against the `bidtop.vn`
domain, the webhook fires, the listing's amount updates correctly, and the transaction is visible
in the ZaloPay merchant dashboard.

### S6-T6 — Domain + deploy
Confirm bidtop.vn is registered and has no conflicting trademark (tech-spec open question); point
DNS at the Vercel deployment; verify HTTPS.
**Acceptance:** `https://bidtop.vn` serves the production app; the domain/trademark check is
documented as resolved (or explicitly flagged if not).

### S6-T7 — Final smoke test
Walk the entire golden path once, end to end, as a real user would: browse → submit → pay → get
approved by an admin → appear on leaderboard → top up → re-rank.
**Acceptance:** every step of that path is confirmed working on the production deployment, with
the result reviewed by the user before calling launch done.

## Dependencies
- Requires all of Sprints 1–5 complete and demoed.

## Risks
- S6-T5 is a domain re-point, not a sandbox-to-production cutover (Sprint 3 already verified
  against ZaloPay's production API) — the main risk is simply remembering to update the callback
  URL in the ZaloPay merchant dashboard before this sprint's smoke test, not a behavior mismatch.

## Definition of Done
- [ ] All tasks meet their acceptance criteria
- [ ] Demo criteria verified end-to-end on production
- [ ] Tests and lint pass; no skipped tests introduced
- [ ] PROGRESS.md updated; user has reviewed the demo and approved launch
