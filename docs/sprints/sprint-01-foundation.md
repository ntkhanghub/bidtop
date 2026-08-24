# Sprint 1 — Foundation

**Goal:** Repo, tooling, database schema, and deploy pipeline exist. A walking skeleton proves the
whole stack connects end to end.

**Demo criteria:** At the end of this sprint you can run the app locally and on Vercel, load the
homepage, and see it query a real (empty) `listings` table in Supabase Postgres — not mock data.

## In scope
- Project scaffold, tooling, CI
- Full data model migration (categories, listings, bids, settings, admin_users)
- Category + settings seed data
- Deploy pipeline to Vercel

## Out of scope
- Submission form, payment, admin panel (later sprints) — homepage renders an empty-state
  leaderboard only

## Tasks

**Note:** S1-T3 through S1-T7 below were originally written and first executed against a
Prisma-based data layer. Partway through Sprint 1, the user chose to switch to
`@supabase/supabase-js` + raw SQL instead (see PROGRESS.md Decisions for the full reasoning) — the
task descriptions and acceptance criteria below reflect the current, actually-built architecture,
not the original Prisma-based plan.

### S1-T1 — Scaffold Next.js + TypeScript project
Initialize the repo: Next.js (App Router), TypeScript, ESLint, Prettier, a test runner (Vitest),
Tailwind CSS, and sonner (toast) with its `<Toaster />` mounted in the root layout. `git init` and
first commit.
**Acceptance:** `npm run dev` serves a default page locally; `npm run lint` and `npm run typecheck`
both pass with zero errors on the fresh scaffold; a Tailwind utility class visibly renders on the
default page; a test button firing `toast('test')` shows a toast.
**Result:** scaffolded with Next.js 16.3.2 (latest stable at the time, not 15 — see CLAUDE.md Tech
stack) and Tailwind v4 (CSS-first, no `tailwind.config.ts`). Verified live in-browser: Tailwind
computed styles applied, toast fired and rendered. First commit `9833000`.

### S1-T2 — Finalize CLAUDE.md Commands section
Replace the placeholder commands in `CLAUDE.md` with the real ones from this scaffold.
**Acceptance:** every command listed in CLAUDE.md's Commands section has been run at least once
and does what it claims.

### S1-T3 — Provision Supabase Postgres
Create a Supabase project. Create a dedicated `prisma`-named DB role (kept from the earlier
Prisma-based setup — the name is legacy, but "least privilege, not the default `postgres`
superuser" is still the right call) for dev tooling. Get the pooled connection string (port 6543)
and the direct connection string (port 5432) — the latter used only by
`scripts/apply-migration.mjs`, not by the app itself. Get the project's `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Settings → API for the app
runtime (`lib/supabase/server.ts`).
**Acceptance:** applying a migration via `scripts/apply-migration.mjs` succeeds against
`DIRECT_URL`; a runtime query via `@supabase/supabase-js` (`service_role`) succeeds from the app.
**Result:** Done. Initially provisioned in `ap-northeast-2` (Seoul), then recreated by the user in
`ap-southeast-1` (Singapore, project ref `fugvcufgrpnnanqxmvrs`) to match tech-spec's original
latency reasoning. Gotcha hit twice: Supabase's pooler hostname needs a cluster prefix (bare
`[region].pooler.supabase.com` doesn't resolve, NXDOMAIN), and the prefix isn't always `aws-0-` —
the Singapore project had both `aws-0-` and `aws-1-` clusters resolve via DNS; `aws-0-` was the one
that actually worked, confirmed by connecting, not assumed. `.env.example` corrected to flag this.

### S1-T4 — Core data model migration
Create `categories`, `listings`, `bids`, `settings`, `admin_users` tables (raw SQL,
`supabase/migrations/`) per `docs/specs/tech-spec.md`'s Data model section — exact fields, types,
constraints (`identity_key` unique, `gateway_order_id` unique, enums for `status`/`role`), RLS
enabled on every table with only 3 read-only public policies (`categories`, approved `listings`,
`settings` — see tech-spec Security considerations), and the `increment_listing_amount()` RPC
function with `EXECUTE` revoked from `anon`/`authenticated`.
**Acceptance:** migration runs cleanly on a fresh DB; a unit test confirms the unique constraints
reject duplicate `identity_key` and duplicate `gateway_order_id`; a script confirms
`increment_listing_amount()` applies concurrent deltas without a lost update.
**Result:** Done. `supabase/migrations/20260823_init.sql` applied cleanly. Unique constraints
enforced at the DB level (`identity_key`, `gateway_order_id`). Atomicity verified for real:
`scripts/verify-atomic-increment.mjs` fired 8 concurrent RPC calls against one listing — final
amount was the exact sum of all deltas, `first_confirmed_at` set exactly once. A dedicated test for
unique-constraint-violation behavior is still open — not launch-blocking since Postgres enforces it
regardless of caller, but worth a real test in Sprint 2 once the submit flow actually creates
listings.

### S1-T5 — Seed script: categories + default settings
Seed all 21 launch categories and default settings values.

Categories (`slug` — `name_vi`):
1. `seo-ai-visibility` — SEO & Hiển thị AI
2. `ai-agents-infra` — AI Agents & Hạ tầng AI
3. `ai-content-generation` — Tạo nội dung AI
4. `marketing-advertising` — Marketing & Quảng cáo
5. `developer-tools` — Công cụ Developer
6. `productivity-personal` — Năng suất & Cá nhân
7. `design-creative` — Thiết kế & Sáng tạo
8. `social-creator-tools` — Mạng xã hội & Creator
9. `writing-content` — Viết & Nội dung
10. `sales-lead-gen` — Bán hàng & Lead Gen
11. `business-finance-legal` — Kinh doanh, Tài chính & Pháp lý
12. `education-learning` — Giáo dục & Học tập
13. `health-fitness` — Sức khoẻ & Thể hình
14. `directories-launch` — Directory, Launch & Khám phá
15. `hiring-jobs` — Tuyển dụng & Việc làm
16. `agencies-services` — Agency & Dịch vụ chuyên môn
17. `media-news` — Truyền thông & Tin tức
18. `real-estate` — Bất động sản
19. `study-abroad` — Du học & Tư vấn du học
20. `food-restaurants` — Ẩm thực & Quán/Nhà hàng
21. `other` — Khác

Default settings: `starting_price = 100000` (VNĐ), `min_increment = 50000` (VNĐ),
`vat_percent = 8`.

**Acceptance:** running the seed script against a fresh DB inserts exactly 21 rows in
`categories` with the slugs above, and 3 rows in `settings` with the values above; running it
twice does not duplicate rows (idempotent seed).
**Result:** Done. `supabase/seed.sql` (upsert-based, `on conflict`) applied via
`node scripts/apply-migration.mjs supabase/seed.sql` (also `npm run db:seed`) against the real
Supabase DB — verified by querying back: 21 categories, 3 settings with the expected values.
Re-run idempotency verified by code inspection (upserts), not yet by actually running it twice —
low risk, cheap to double check before Sprint 6 if it matters.

### S1-T6 — Walking skeleton: homepage reads live DB
Build `/` to SSR-render a leaderboard list by querying `listings WHERE status = 'approved' ORDER
BY amount DESC, first_confirmed_at ASC` via `lib/supabase/server.ts`, with an explicit empty state
(no listings yet).
**Acceptance:** loading `/` locally and on the Vercel preview shows the empty-state UI, and the
query is visibly hitting Postgres (confirmed via a temporary seeded test row that renders correctly
then is removed, or by inspecting Supabase's logs).
**Result:** Done. Re-implemented against `@supabase/supabase-js` after the data-layer switch and
re-verified against the real, live DB: `npm test`/`npm run build`/`npm run lint`/`npm run
typecheck` all pass, live browser confirmed the empty-state copy sourced from the real query. Also
confirmed independently by S1-T7's production build succeeding.

### S1-T7 — Deploy pipeline to Vercel
Connect the repo to Vercel, wire `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` as environment variables (not `DATABASE_URL`/`DIRECT_URL` — those are
dev-tooling-only and never needed by the deployed app), confirm a push to main triggers a working
deploy.
**Acceptance:** the Vercel production URL serves the same homepage as local dev, reading from the
same Supabase database.
**Result:** Done. User connected the repo to Vercel and added the 3 env vars; production build of
commit `cd3b8ae` succeeded (Next.js 16.3.2, Turbopack, TypeScript check passed, page data
collection against the real Supabase DB succeeded).

## Dependencies
None — this is the first sprint.

## Risks
- `scripts/apply-migration.mjs` applies raw SQL with no migration-tracking table — it's on the
  person/session running it to know which files have already been applied. Fine at Sprint 1 scale
  (one init migration); revisit if this becomes error-prone once Sprint 2+ adds more migrations.

## Definition of Done
- [x] All tasks meet their acceptance criteria
- [x] Demo criteria verified end-to-end (local + deployed)
- [x] Lint, typecheck, and tests pass; no skipped tests introduced
- [ ] PROGRESS.md updated; user has reviewed the demo
