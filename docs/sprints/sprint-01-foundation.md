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

### S1-T3 — Provision Supabase Postgres + Prisma — code ready, blocked on real credentials
Create a Supabase project (Singapore region). Get the pooled connection string (port 6543) and the
direct connection string (port 5432). Prisma 7 doesn't support `url`/`directUrl` in
`schema.prisma` — wiring is split: `DIRECT_URL` goes into `prisma.config.ts`'s
`datasource.url` (used by the CLI: migrate, seed, studio), and `DATABASE_URL` (pooled) is read by
`lib/db.ts`'s `@prisma/adapter-pg` driver adapter at runtime.
**Acceptance:** `npx prisma migrate dev` runs cleanly against Supabase via `DIRECT_URL`; a runtime
query against the pooled `DATABASE_URL` succeeds from a local script.
**Status:** `prisma.config.ts` and `lib/db.ts` are written and typecheck/lint clean against a
placeholder `.env` (see `.env.example`). Not yet verified against a real database — needs a real
Supabase project's connection strings from the user before `migrate dev` can actually run.

### S1-T4 — Core data model migration
Create `categories`, `listings`, `bids`, `settings`, `admin_users` tables per
`docs/specs/tech-spec.md`'s Data model section — exact fields, types, constraints
(`identity_key` unique, `gateway_order_id` unique, enums for `status`/`role`).
**Acceptance:** migration runs cleanly on a fresh DB; Prisma Client generates without errors; a
unit test confirms the unique constraints reject duplicate `identity_key` and duplicate
`gateway_order_id`.

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

### S1-T6 — Walking skeleton: homepage reads live DB
Build `/` to SSR-render a leaderboard list by querying `listings WHERE status = 'approved' ORDER
BY amount DESC, first_confirmed_at ASC`, with an explicit empty state (no listings yet).
**Acceptance:** loading `/` locally and on the Vercel preview shows the empty-state UI, and the
query is visibly hitting Postgres (confirmed via Prisma logs or a temporary seeded test row that
renders correctly then is removed).

### S1-T7 — Deploy pipeline to Vercel
Connect the repo to Vercel, wire `DATABASE_URL` and `DIRECT_URL` as environment variables, confirm
a push to main triggers a working deploy.
**Acceptance:** the Vercel production URL serves the same homepage as local dev, reading from the
same Supabase database.

## Dependencies
None — this is the first sprint.

## Risks
- Supabase's connection pooler under Vercel's serverless functions can exhaust connections or
  reject Prisma Migrate if the wrong connection string is used for the wrong purpose — always use
  the pooled `DATABASE_URL` for app queries and the direct `DIRECT_URL` for migrations (S1-T3),
  never the reverse.

## Definition of Done
- [ ] All tasks meet their acceptance criteria
- [ ] Demo criteria verified end-to-end (local + deployed)
- [ ] Lint, typecheck, and tests pass; no skipped tests introduced
- [ ] PROGRESS.md updated; user has reviewed the demo
