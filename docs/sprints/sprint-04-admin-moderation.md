# Sprint 4 — Admin panel & moderation

**Goal:** An authenticated admin can review Sprint 3's `paid_pending_review` listings and either
approve them onto the leaderboard or reject them; a super_admin can tune pricing settings.

**Demo criteria:** At the end of this sprint an admin can log in, see a real
`paid_pending_review` listing produced by paying through Sprint 3's flow, correct its category,
approve it (making it `approved`), and a super_admin can change `starting_price` and confirm the
new value applies to a fresh submission.

## In scope
- F8 — Admin moderation panel
- F9 — Admin settings (super_admin only)

## Out of scope
- Public-facing leaderboard rendering of `approved` listings (Sprint 5 builds the actual public
  pages, though the query itself was already proven in S1-T6)

## Tasks

### S4-T1 — Admin auth
Session-based login for `admin_users` (email + password, argon2id hashing, httpOnly session
cookie). Seed one `super_admin` account via a one-off script (not a public sign-up flow — there is
no admin self-registration).
**Acceptance:** correct credentials create a session and grant access to `/admin`; incorrect
credentials are rejected; an unauthenticated request to any `/admin` route redirects to login.

### S4-T2 — Role enforcement (admin vs super_admin)
Server-side role check on every admin route/action — settings-write actions require
`super_admin`, everything else requires at least `admin`.
**Acceptance:** a plain `admin` session gets a 403 (not just a hidden UI element) when attempting
to save settings; a `super_admin` session succeeds on the same action.

### S4-T3 — Pending queue UI
List all `status = 'paid_pending_review'` listings, newest first, showing normalized URL,
suggested/current category (editable dropdown), submitter email, and amount.
**Acceptance:** a listing produced by completing Sprint 3's payment flow appears in this queue
with correct data.

### S4-T4 — Approve/reject actions
Approve sets `status = 'approved'`; reject requires a free-text reason and sets
`status = 'rejected'`. Both actions are logged (who, when, what).
**Acceptance:** approving makes the listing satisfy the S1-T6 leaderboard query
(`status = 'approved'`); rejecting removes it from the queue and it never appears in that query;
attempting to reject without a reason is blocked client- and server-side.

### S4-T5 — Settings page (super_admin only)
Editable fields for `starting_price`, `min_increment`, `vat_percent`, with server-side validation
(positive integers; VAT 0–100).
**Acceptance:** saving a new `starting_price` changes the computed minimum shown on a *new*
Sprint 2 submission attempt immediately, without affecting any `amount` already stored on existing
listings.

## Dependencies
- Requires Sprint 3's payment flow to produce real `paid_pending_review` rows to act on.

## Risks
- None significant — this sprint is mostly CRUD over an already-correct data model.

## Definition of Done
- [ ] All tasks meet their acceptance criteria
- [ ] Demo criteria verified end-to-end
- [ ] Tests and lint pass; no skipped tests introduced
- [ ] PROGRESS.md updated; user has reviewed the demo
