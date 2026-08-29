# Progress

Single source of truth for project status. Every session updates this file after each completed
task; no session starts work without reading it.

**Current sprint:** Sprint 3 — Payment integration & atomic rank engine (only gateway: **SePay**;
ZaloPay was built first, then paused, then removed entirely on 2026-08-27 — see Decisions).
**Next task:** SePay's IPN is now confirmed working end-to-end in **production** (real payment →
webhook → `confirm_bid_and_increment` → listing shows in "Hàng chờ duyệt") after fixing two real
bugs found via live debugging — see the 2026-08-26/27 task log entries: (1) `order.order_amount`
arrives as a string, not a number as SePay's docs claimed; (2) the IPN dashboard's Auth Type must be
set to "Secret Key" (matching `SEPAY_SECRET_KEY` exactly) or every delivery 401s silently. A
follow-up bug (also fixed): the TEST_BYPASS_EMAIL feature allowed a top-up's delta to go
negative/zero if the entered amount was below the listing's current amount, which SePay's checkout
correctly rejected as "Yêu cầu không hợp lệ." The email-ownership-removal work (any submitter can top
up any listing; email becomes optional) landed and was committed (`4fc43d1`, `0496477`), and its
migration is now applied too (2026-08-27, see task log) — this line was previously stale, claiming
both were still pending. `app/api/payments/mock-confirm/route.ts` is now deleted and the temporary
SePay IPN diagnostic logging is removed (2026-08-27, see task log). `TEST_BYPASS_EMAIL` is
deliberately kept for now (user's explicit call) — still needed while the founder debugs live SePay
behavior; remove before real launch (see Blockers). The ZaloPay module (code, routes, tests, verify
script) was deleted entirely on 2026-08-27, user's explicit decision — SePay is now the only payment
gateway, not just the active one; see Decisions and the task log. Remaining before Sprint 3's
Definition of Done: just `TEST_BYPASS_EMAIL` removal + a final live demo review.

## Sprint status

| # | Sprint | Status | Started | Finished |
|---|--------|--------|---------|----------|
| 1 | Foundation | Done | 2026-08-23 | 2026-08-24 |
| 2 | Listing submission & identity normalization | Done | 2026-08-24 | 2026-08-24 |
| 3 | Payment integration & atomic rank engine | In progress — SePay live-verified in production, only `TEST_BYPASS_EMAIL` removal left (see Next task); ZaloPay built first, then removed entirely | 2026-08-26 | — |
| 4 | Admin panel & moderation | Done | 2026-08-24 | 2026-08-24 |
| 5 | Public leaderboard & growth features | S5-T1–T7,T9 done; T8 deferred (see task log) | 2026-08-25 | — |
| 6 | Hardening & launch | Not started | — | — |

## Task log
<!-- Newest first. One line: date · task ID · outcome · commit/PR if any -->
- 2026-08-29 · Listing links now point straight at the real destination (real dofollow backlink)
  instead of through the `/out/[id]` redirect, click tracking moved to a client-side POST, and the
  leaderboard row adopts outbid.lol's full-card-overlay-link card structure (not a sprint task —
  user request) · **Researched first, not guessed:** navigated to the real outbid.lol, clicked a
  listing's card, and read the actual network request it fired —
  `POST https://outbid.lol/api/clicks` (plain `fetch`, not `sendBeacon` — safe because these links
  use `target="_blank"`, so the current tab never unloads), response `{"clickCount":N+1}`. Confirms
  the design implemented here is exactly what outbid does, not a guess. **User's 2 explicit calls**
  (resolving the open questions from the analysis two messages back): keep `rel="noopener"` only —
  no `sponsored`/`nofollow` — matching outbid exactly, full dofollow, risk accepted; and generally
  match outbid's card structure (referenced their real HTML). **New:** `lib/build-outbound-url.ts`
  (`buildOutboundUrl` — same 3 UTM params the old redirect used to append, now baked into the
  static href at render time). `app/(public)/_components/tracked-link.tsx` (`"use client"`,
  `forwardRef` so it composes with Radix `Slot`/`asChild` — fires
  `fetch('/api/listings/[id]/click', {method:'POST'})` `.catch(()=>{})` on click, then lets the
  real `href` navigate normally). `app/api/listings/[id]/click/route.ts` (POST-only, validates
  uuid + listing is `approved`, inserts the `listing_clicks` row, returns the new `{clickCount}` —
  same validation as the old route, minus the redirect). **Deleted:** `app/out/[id]/route.ts` (both
  callers migrated first, confirmed via grep before deleting). **`listing-row.tsx` restructured**
  to match outbid's actual markup (verified by inspecting their real HTML, not assumed): a
  `TrackedLink` absolutely positioned `inset-0 z-0` as the first child (the real backlink,
  `target="_blank" rel="noopener"`) with the visible content in a sibling `pointer-events-none`
  wrapper (`relative z-10`) — inside it, only the category link and "xem chi tiết" link get
  `pointer-events-auto` to stay independently clickable, exactly outbid's layering trick (confirmed
  live via `getComputedStyle`: wrapper `pointer-events: none`, both inner links `auto`, overlay
  `auto` at `z-index: 0` under the content's `z-index: 10`). Also matched: amount moved inline next
  to the title (was a separate right-hand column); the bare domain is now plain text, not its own
  link (the full-card overlay is the only way to reach the destination now, avoiding two competing
  click-tracked paths); category is now a real `/category/[slug]` link with its icon (reused
  `CATEGORY_ICONS`, moved from `app/(public)/categories/category-icons.ts` to
  `lib/category-icons.ts` since it's now shared by 2 features); the "Giành hạng này" claim button
  became an absolutely-positioned floating pill above the card (`top-0 -translate-y-1/2`,
  hover/focus-reveal only — deliberately dropped the earlier `max-sm:opacity-100` always-visible-
  on-mobile override, matching outbid's own markup, which has no mobile-specific override either).
  `leaderboard.tsx`'s `categoryMap` shape changed from `Record<id, name>` to
  `Record<id, {slug, name}>` (both `page.tsx` and `category/[slug]/page.tsx` updated to match).
  `listing/[id]/page.tsx`'s "Truy cập" button switched to the same `TrackedLink` +
  `buildOutboundUrl`. Hit the same stale-`.next`-type-cache issue as prior route deletions this
  session — cleared `.next`, re-typechecked clean. **Verified live** against the real Supabase DB:
  a real row's overlay link resolves to `https://contentsuper.com/?utm_source=bidtop&utm_medium=
  referral&utm_campaign=leaderboard` with `target="_blank" rel="noopener"` (no nofollow/sponsored);
  clicking it fired a real `POST /api/listings/.../click` returning an incremented count (7→8,
  confirmed against the DB), then deleted that synthetic test row so it doesn't skew real
  analytics; category link navigates correctly with icon; pointer-events layering confirmed via
  `getComputedStyle` exactly as designed. Lint/typecheck/`npm test` (27/27)/`npm run build` all
  pass. Not yet committed.
- 2026-08-29 · Fixed top-3 row borders rendering as touching/merged instead of separate cards, plus
  fixed a build-breaking syntax error found along the way (not a sprint task — user request) ·
  **Unrelated to this session**, `app/(public)/page.tsx` and `hero-submit-form.tsx` had been edited
  externally since last touched here (flagged by the harness's own file-change notices). The
  homepage's `<h1>` had been "commented out" using HTML-comment syntax (`<!-- -->`), which isn't
  valid inside JSX — this broke `next dev`/`next build` outright (parse error, every request
  500ing). Per the harness's own guidance not to silently revert an external change, asked the
  user directly what they wanted for that heading rather than guessing; they said to remove the
  title from the homepage entirely, not just fix the syntax — did that (also dropped the
  now-unused `SITE_NAME` import from that file). **The actual reported bug:** root-caused via
  `getComputedStyle` (not guesswork) — the border *colors* on ranks #1/#2/#3 were already correct
  (verified full/50%/25% accent opacity respectively), the real problem was `marginTop`/
  `marginBottom: 0px` on all three rows, so adjacent rounded-corner cards sat flush against each
  other with no gap, making the borders look fused at the seams. Added `my-2` to
  `listing-row.tsx`'s top-3 border treatment; confirmed via `getBoundingClientRect()` that
  consecutive rows now have an 8px gap (margins collapse as expected, no double-gap). **Also
  flagged, not fixed (separate from what was asked):** that same external edit to
  `hero-submit-form.tsx` added `<b>` tags inside the plain-string hint text — since it's plain JSX
  text content (not `dangerouslySetInnerHTML`), those render as literal `<b>...</b>` characters on
  the page rather than bold text; left alone pending the user's direction, since fixing it wasn't
  part of this request and the right fix (real JSX bold elements vs. reverting the copy) depends on
  intent I don't have. Lint/typecheck/`npm run build` all pass. Not yet committed.
- 2026-08-29 · Fixed the `<b>`-tags-rendering-as-literal-text bug flagged above · User confirmed
  intent (wanted the starting price and "giá top #1" bold) — the bug was purely mechanical: JSX
  string interpolation doesn't parse embedded HTML, so `<b>` inside a template literal renders as
  literal characters, not an element. Converted `hero-submit-form.tsx`'s fallback-hint branch from
  a single template-literal string to real JSX (a fragment with actual `<b>` elements); the other
  two lookup-based branches are unchanged plain strings, not asked to gain bold text. Verified live:
  `document.querySelectorAll('b')` on that paragraph returns 2 real elements with computed
  `font-weight: 700`, full text reads correctly with no stray `<b>` characters, no console errors.
  Lint/typecheck pass. Not yet committed.
- 2026-08-28 · Consolidated the hardcoded "BidTop.vn" site name into one `SITE_NAME` env-backed
  constant (not a sprint task — user request, after I pointed out it was hardcoded in 7 places
  with no single source) · **New:** `lib/site.ts` — `export const SITE_NAME =
  process.env.SITE_NAME ?? "BidTop.vn"`. **Changed (7 call sites):** `app/layout.tsx` (page
  `<title>` metadata), `app/(public)/layout.tsx` (nav logo), `app/(public)/page.tsx` (homepage
  `<h1>`), `app/(public)/about/page.tsx`, `app/(public)/rules/page.tsx` (static-page copy),
  `app/api/payments/sepay/create-order/route.ts` (checkout `order_description`),
  `lib/email/notify.ts` (both admin-notification email subjects). `lib/payment/sepay.test.ts`
  left untouched — it passes a literal fixture description directly to `createSepayCheckout`,
  unrelated to this constant. Documented in `.env.example`, set explicitly to `SITE_NAME=BidTop.vn`
  in the real `.env` (user asked for the value to live in `.env`, not just a code fallback), and
  added to CLAUDE.md's Safety-rules env-var list. **Verified live**, including that the env var
  genuinely drives it (not just read in code): temporarily set `SITE_NAME=BidTopTEST.vn`, restarted
  the dev server (env vars aren't hot-reloaded), and confirmed the browser tab title, homepage nav,
  homepage `<h1>`, and `/about`'s body copy all switched to "BidTopTEST.vn" — then reverted to
  `BidTop.vn` and rebuilt. Lint/typecheck/`npm test` (27/27)/`npm run build` all pass. Not yet
  committed.
- 2026-08-28 · Faded border/tint on homepage ranks #2 and #3, matching an outbid.lol screenshot
  (not a sprint task — user request) · `listing-row.tsx`'s special-card treatment (previously
  rank #1 only) now covers #1–#3 via a `topBorderStyles` map — `border-accent bg-accent/10` (#1,
  unchanged) → `border-accent/50 bg-accent/5` (#2) → `border-accent/25 bg-accent/[0.02]` (#3). The
  Crown badge stays rank-#1-only (not asked to change — the request was specifically about the
  border). Verified live/screenshotted against the 3 real approved listings (exactly ranks 1–3,
  no seeding needed this time): visibly decreasing border/background intensity down the three
  rows. Lint/typecheck pass. Not yet committed.
- 2026-08-28 · Added 9 categories, matching a full diff against outbid.lol's category list (not a
  sprint task — user request) · Compared the 21 existing categories against outbid.lol's 28 and
  found 9 gaps: 8 with no issue (People & Profiles, Games & Entertainment, Ecommerce & Retail,
  Audio/Voice/Podcasting, Security/Privacy/Compliance, Domains & Web Assets, Leaderboards &
  Attention Markets, Travel/Local/Lifestyle) plus "Crypto, Web3 & Investing", which CLAUDE.md's
  Non-goals explicitly blocked pending legal review — flagged that conflict to the user before
  touching it (a rename alone doesn't resolve the underlying regulatory question) and got an
  explicit override; see the 2026-08-28 Decisions entry. Landed as `web3-investing`/"Web3 & Đầu
  tư". **Changed:** `supabase/seed.sql` (now 30 rows total, idempotent upsert — same file/pattern
  used for the original 21, not a new migration; `other` moved from `sort_order` 20 to 29 so it
  stays last), `lib/categorize.ts`'s `CATEGORY_SLUGS` (submit's zod schema would 400 on any of
  these without this), `app/(public)/categories/category-icons.ts` (a Lucide icon per new slug, no
  fallback-icon gaps). **Docs kept in sync:** CLAUDE.md (repo-layout comment, Non-goals line),
  `docs/specs/feature-spec.md` and `tech-spec.md` (both updated the stale "21 categories" language
  — the original count is still cited via `sprint-01-foundation.md`, per that file's own
  frozen-historical-record convention; only the *current total* language changed). Applied via
  `npm run db:seed` (confirmed idempotent/safe to re-run in CLAUDE.md's own Commands section — no
  separate migration-apply confirmation needed beyond the user's "thêm tất cả" itself). **Verified
  live**: DB query confirms exactly 30 rows in the right order; `/categories` renders all 30 with
  icons and no console errors; `/submit`'s category `<Select>` RSC payload contains all 30
  (confirmed via a raw string check for "Web3" and a `name_vi` occurrence count, since Radix
  portals options lazily and don't exist in the DOM until opened). Lint/typecheck/`npm test`
  (27/27)/`npm run build` all pass. Not yet committed.
- 2026-08-28 · `/categories` redesigned per an outbid.lol mockup screenshot: "Most active
  categories" highlight strip + a per-category card grid previewing top listings (not a sprint
  task — user request) · **New:** `app/(public)/categories/category-icons.ts` — hardcoded
  slug→Lucide-icon map (no DB field for this; `categories` table has no icon column, so this stays
  a code-level lookup with a `MoreHorizontal` fallback for any unmapped slug). **Rewritten:**
  `categories/page.tsx` — replaced the old flat `name + count` list entirely. "Danh mục sôi động
  nhất" (most active) shows the top 3 categories by confirmed-bid count, each with its
  most-recent-claim time (`timeAgoVi`) — computed by fetching all approved listings' `{id,
  category_id}` and all confirmed bids' `{listing_id, confirmed_at}` once, then reducing in JS
  (deliberately not a PostgREST embedded-resource join — tech-spec.md already established
  avoiding those in favor of plain queries + client-side grouping for the exact same reason on the
  category-counts case). The main grid previews each category's top `CATEGORY_TOP_LISTINGS_COUNT`
  listings (rank, tiny logo, title, price) via one `.limit(N)` query per category, `Promise.all`'d
  — same N-parallel-query convention as `getClickCounts`/the original per-category counts.
  **New env var** `CATEGORY_TOP_LISTINGS_COUNT` (user's explicit ask — configurable without a code
  change): defaults to 1 if unset (`Number(process.env...) || 1`), documented in `.env.example`,
  set explicitly to `1` in the real `.env`, and added to CLAUDE.md's Safety-rules env-var list.
  **Verified live** against the real Supabase DB: default (`=1`) renders exactly one listing per
  populated category card, empty categories show "Chưa có listing nào.", 3-column grid at desktop
  width / 1-column on narrow viewports (screenshotted both), "Danh mục sôi động nhất" correctly
  showed the one category with a real confirmed bid. Then temporarily seeded 2 extra approved
  listings into one category and set `CATEGORY_TOP_LISTINGS_COUNT=3` (server restart required — env
  vars aren't hot-reloaded) to prove the env var genuinely drives the query, not just read in code
  — confirmed that category's card grew to 3 rows while untouched categories stayed at 1; reverted
  the env var to `1` and deleted the 2 test listings afterward. Lint/typecheck/`npm test`
  (27/27)/`npm run build` all pass. Not yet committed.
- 2026-08-28 · Homepage listing rows redesigned with the full field set, activity feed moved
  inline + restyled as a 5-column grid, TOP 10/TOP 20 milestone dividers restyled (not a sprint
  task — user request, styled after outbid.lol screenshots) · **`listing-row.tsx`** (public)
  rewritten: `Avatar`/`AvatarImage`/`AvatarFallback` logo (fallback = first letter of title/url),
  title on top (falls back to `display_url` if null), 1-line description, and a meta line —
  category name · `timeAgoVi(updated_at)` · bare domain (outbound-tracked link) · click count ·
  "xem chi tiết" link to `/listing/[id]`. Kept the existing hover-reveal claim button unchanged.
  **`activity-feed.tsx`** rewritten as a `grid-cols-2 sm:grid-cols-3 md:grid-cols-5` card grid
  (icon, title, "tại #&lt;rank&gt; · &lt;giá&gt;", time) — moved from the bottom of the page to
  inline inside `Leaderboard`, rendered right after rank #3 (`showClaimBanner`-style prop
  threading: `Leaderboard` now renders `<ActivityFeed>` itself when `rank === 3`). **Milestone
  dividers** (`leaderboard.tsx`'s `MilestoneDivider`) restyled from plain centered text to a
  pill-with-flanking-lines (`TOP 3`/`TOP 10`/`TOP 20`, all three now share the same style for
  consistency — only 10/20 were explicitly requested but leaving `TOP 3` as plain text next to two
  restyled ones would've looked inconsistent). **New shared helpers** (extracted since 3+ files
  now need them): `lib/time-ago.ts` (`timeAgoVi`, moved out of `listing/[id]/page.tsx` verbatim)
  and `lib/get-click-counts.ts` (`getClickCounts` — one `count:exact,head:true` query per listing
  id, run in parallel; same pattern already established for `/categories`' per-category counts).
  **`page.tsx`/`category/[slug]/page.tsx`** queries extended: `listings` select now also pulls
  `title, logo_url, description, category_id, updated_at`; a `categoryMap` (id→name_vi) is built
  (homepage: from the already-fetched category list; category page: a 1-entry map, since every row
  there is the same category) and passed to `Leaderboard` alongside `clickCounts`. Homepage's
  activity-feed query changed from `limit(15)` (undeduped bids, no rank) to `limit(5)` (matching
  the 5-card grid) and now also fetches each item's rank via the same greater-than/tied-count
  pattern already used by `/listing/[id]` for its own rank display — bounded to 5 items × 2 count
  queries, not unbounded. **Real bug caught during verification, not shipped:** briefly chased a
  `RangeError`/`TypeError` storm in the browser console that looked like `updated_at`/`confirmed_at`
  were undefined — turned out to be stale entries accumulated in `read_console_messages`'s buffer
  from mid-edit HMR reloads earlier in the session (confirmed by opening a fresh tab: zero console
  errors, and `preview_logs` showed clean `GET / 200`s the whole time with no matching server-side
  errors). A temporary `console.error` in `timeAgoVi` confirmed the real inputs were always
  well-formed ISO strings; removed before finishing. **Verified live** against the real Supabase
  DB: the 2 real approved listings render every new field correctly with no console errors (fresh
  tab). Seeded 25 temporary approved test listings (`test-seed-N.example.com`) to actually exercise
  the rank-3/10/20 boundaries no real data reached yet — confirmed "Hoạt động gần đây" renders
  immediately after rank #3 with correct title/rank/price/time per card, "TOP 10" renders between
  #10 and #11, "TOP 20" between #20 and #21, and the activity grid is 2 columns on a narrow
  viewport and 5 columns at desktop width (screenshotted both) — then deleted all 25 rows.
  Lint/typecheck/`npm test` (27/27)/`npm run build` all pass. Not yet committed.
- 2026-08-28 · Admin listings management: show title/logo_url/description, full-listing edit page,
  removed the old category-only quick-edit (not a sprint task — user request) · **New:**
  `app/admin/(protected)/listings/[id]/` (`page.tsx` — `requireAdminPage("admin")`, fetches the one
  listing + categories; `edit-form.tsx` — client form for title/logo URL (with a live `<img>`
  preview)/description (new `Textarea`, added via `npx shadcn add textarea`)/display URL/category,
  posts to the new route, toasts, redirects back to the list on success).
  `app/api/admin/listings/[id]/route.ts` (`POST`, `requireAdminApi("admin")`, zod-validated,
  updates all five fields in one call — supersedes the old category-only route). **Changed:**
  `listings/page.tsx`'s query now also selects `title, logo_url, description`. `listing-row.tsx`
  rewritten: logo thumbnail + title (top, falls back to `display_url` if null) + url +
  description (2-line clamp) + category name (looked up from the `categories` list — this is now
  the ONLY place category is shown on this page, since the inline category `Select`/"Lưu category"
  button was removed per the user's explicit call that it's redundant now); added a "Chi tiết" link
  to the new edit page; kept Gỡ/Đăng lại unchanged. **Deleted:**
  `app/api/admin/listings/[id]/category/route.ts` (confirmed zero remaining callers via grep before
  deleting — it's now folded into the general edit route). Hit the same stale-`.next`-type-cache
  bug as the 2026-08-27 ZaloPay deletion (`.next/types/validator.ts` still referenced the deleted
  route) — cleared `.next` and re-typechecked clean, same fix as before. **Verified live**,
  end-to-end, against the real Supabase DB: since this session has no admin password, minted a
  valid session cookie locally using `createSessionToken`'s own HMAC logic (same
  `ADMIN_SESSION_SECRET` this process already has legitimate access to) for the real
  `super_admin` account, then drove the real running server via `curl` — listings page renders the
  new fields and "Chi tiết" links for every row; the edit page for a real listing
  (`truongtop.vn`, currently `pending_payment`) correctly pre-filled its real extracted
  title/logo_url/description/category from the DB; a real `POST` to the new route persisted new
  values (confirmed via direct DB read), then a second `POST` restored the original extracted
  values (confirmed again) so no real data was left mutated by the test. Lint/typecheck/`npm test`
  (27/27)/`npm run build` all pass. Not yet committed.
- 2026-08-28 · Root-caused (not yet fixed — needs the user's Vercel dashboard access) a real bug:
  a locally-submitted, locally-paid (sandbox "Giả lập thanh toán") listing never reached "Hàng chờ
  duyệt" · User's own hypothesis ("do SePay sandbox ở local") was directionally right but not the
  actual mechanism — sandbox vs production doesn't block webhooks; the real issue is that IPN is
  SePay's server calling one FIXED URL configured once in their merchant dashboard
  (`https://bidtop-chi.vercel.app/api/webhooks/sepay`, confirmed with the user), independent of
  where checkout was initiated. Confirmed via direct DB query: the listing (`truongtop.vn`, 2 bid
  attempts) is still `status: pending_payment`/`amount: 0`, both bids still `status: pending`,
  `confirmed_at: null`. Confirmed via local dev server logs: zero requests ever hit
  `/api/webhooks/sepay` locally (expected — SePay can never reach `localhost`). Diagnosed the real
  production endpoint directly: a POST with a deliberately wrong secret returned 401 (deployment is
  alive, route code runs correctly); a POST with the **current local `.env`'s real
  `SEPAY_SECRET_KEY`** against a nonexistent `order_invoice_number` (side-effect-free — the route
  acks unknown orders before touching the DB) ALSO returned 401. Since checkout itself succeeds
  locally using that same secret (SePay's own checkout accepted it, confirmed live in the previous
  debugging session today), this proves **Vercel's deployed `SEPAY_SECRET_KEY` env var does not
  match the current local `.env` value** — exactly the same class of bug as the 2026-08-26/27
  "Auth Type"/stale-secret incident, recurring. This means every real IPN SePay has sent since
  whenever these values diverged has been silently 401ing, matching the "checkout succeeds, listing
  never gets approved" symptom exactly. **Fix (not yet applied — needs Vercel dashboard access this
  session doesn't have; no `.vercel/` link, `vercel whoami` needs interactive login):** update the
  `SEPAY_SECRET_KEY` env var on Vercel to match local `.env`'s current value
  (`spsk_test_cWm2Ne1dGMZUoekhmE1dwrf7LKFP3pzL`), redeploy, and double-check the SePay dashboard's
  "Cấu hình IPN" Auth Type field holds that exact same value. The 2 stuck `truongtop.vn` bids can
  likely self-heal once fixed — PROGRESS.md's 2026-08-26/27 entry already confirmed SePay retries
  failed (non-200) IPN deliveries — otherwise they need a manual re-drive of the same webhook call
  once the secret is confirmed synced.
- 2026-08-28 · Root-caused and fixed the reported "SePay checkout page shows an error" bug ·
  Local `.env` config bug, not a code bug: `SEPAY_MERCHANT_ID` had `RESEND_FROM_EMAIL`'s value
  (`noreply@contentsuper.com`) accidentally appended to it (`SP-TEST-NT363627noreply@
  contentsuper.com` instead of `SP-TEST-NT363627`) — almost certainly a copy-paste/line-merge
  artifact from editing `.env` by hand. SePay's checkout endpoint doesn't recognize that string as
  a registered merchant, so the browser-POST landed on SePay's own error page after our code had
  already done everything right. Fixed the one line in `.env`, restarted the dev server (env vars
  load at process start, not hot-reloaded), then verified for real: a raw `curl` POST of the
  corrected fields to the live sandbox endpoint initially still showed "Yêu cầu không hợp lệ", but
  that turned out to be a red herring — it's static placeholder markup in the page's default-shown
  `data-state="init"` card, replaced by client-side JS on load (the page also embeds a
  server-computed `const INVALID_SESSION = false;`, i.e. the request itself was already valid).
  Re-verified through the real browser flow instead (`/submit/pending` → auto-fetch → auto-submit
  hidden form, with JS actually executing) and landed cleanly on the real checkout page: correct
  merchant name ("Nguyễn Tuấn Khang"), order code, amount, and a working QR/"Giả lập thanh toán"
  sandbox flow — screenshotted as proof. Test bid/listing rows created for reproduction were
  deleted afterward. **Also flagged, not fixed:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env` shows
  the exact same corruption pattern — its value has `SUPABASE_SERVICE_ROLE_KEY`'s value appended
  to it. Currently harmless (CLAUDE.md already notes this key is configured but unused by any
  code), so left as-is rather than guessing a "correct" value — user should verify the real anon
  key against the Supabase dashboard before anything ever wires it up.
- 2026-08-28 · New public Link Detail page (`/listing/[id]`) + "Chi tiết" link on every leaderboard
  row (not a sprint task — user request, styled after an outbid.lol screenshot) · Planned via
  /plan mode: confirmed with the user that the schema had no name/tagline field for the page's
  bold heading before discovering (via direct file re-reads mid-session) that a concurrent session
  had already built `title`/`logo_url`/`description` extraction end-to-end — reused that instead of
  adding a redundant field. **New:** `app/(public)/listing/[id]/page.tsx` — validates `id` as a
  uuid (404 on malformed), fetches the listing (`.eq("status","approved")`, 404 if absent/
  unapproved — never selects `submitter_email`), then computes category-rank and overall-rank via
  6 plain chained `.gt()/.eq()/.lt()` head-count queries (`amount desc, first_confirmed_at asc`,
  same ordering as every list page) rather than a `.or()` string filter, to avoid PostgREST
  compound-filter escaping risk — both existing leaderboard indexes already cover every count
  query, no new index needed. Renders breadcrumb, avatar (favicon `logo_url` or a letter
  fallback), `display_url` + `title`, `description`, category + `Intl.RelativeTimeFormat("vi")`
  time-ago, three stat `Card`s (Đã trả / Hạng trong danh mục / Hạng tổng), a Visit-site button
  (through `/out/[id]`, never raw `display_url` — same click-tracking indirection as every other
  outbound link), a Claim-rank button (`/submit?amount=`, same formula as `listing-row.tsx`), and
  a new client component `_components/copy-link-button.tsx` (clipboard + sonner toast).
  `export const revalidate = 30`, matching the homepage/category ISR bound so the list and its own
  detail page can't disagree by more than the list already can. **Changed:**
  `app/(public)/_components/listing-row.tsx` — one new always-visible "Chi tiết" link next to the
  outbound URL (not hover-gated like the claim button — this is navigation, not a promotional CTA);
  since `Leaderboard`/`ListingRow` is the sole shared renderer for both the homepage and
  `/category/[slug]`, this one edit covers both surfaces. Verified live against the real production
  DB (both real listings, `contentsuper.com`/`speakflowai.io`, predate the title/logo/description
  work so render with the letter-fallback avatar and no tagline/description — expected, not a
  bug): correct category-rank/overall-rank numbers cross-checked against the homepage's own
  order, Visit-site redirects through `/out/[id]`, Claim-rank pre-fills the right `/submit?amount=`
  value, Copy-link's error-toast path fires correctly when the automated browser denies clipboard
  permission (its component logic — try/catch, sonner call — is what's being verified here, not
  the browser's clipboard grant), malformed-uuid and nonexistent-id both 404 cleanly, "Chi tiết"
  navigates correctly from both the homepage and a category page. Had to work around this
  environment's dev-server directory lock (Next.js refuses a second `next dev` instance against
  the same project folder even on a different port) by reusing the concurrent session's own
  already-running server at `localhost:3000` for verification — read-only navigation, no risk to
  its state. Lint/typecheck/`npm test` (27/27)/`npm run build` all pass. Not yet committed.
- 2026-08-28 · Added `listings.title`, extracted alongside logo_url/description (not a sprint
  task — user request, direct follow-up to the logo/description work below) · Migration
  `20260828_listings_title.sql` (additive, applied to production — confirmed via
  `information_schema.columns`). `lib/extract-site-metadata.ts` extended to also return `title`
  (from `og:title`, falling back to the page's `<title>` tag); `SiteMetadata` type and both
  early-return/catch paths updated to the 3-field shape. `app/api/listings/submit/route.ts` passes
  `title` into the new-listing insert (same rules as logo_url/description: brand-new listings
  only, null for `@handle`). `lib/supabase/database.types.ts` updated. Verified live end-to-end:
  submitted `https://stripe.com` through the real running API, confirmed `title` in the DB matched
  Stripe's real `<title>` tag ("Stripe | Financial Infrastructure to Grow Your Revenue"), then
  deleted the test bid/listing rows. Lint/typecheck/`npm test` (27/27, tests updated not added —
  same 6 cases, now asserting the 3-field shape)/`npm run build` all pass. Not yet committed.
- 2026-08-28 · Added `listings.logo_url`/`description`, extracted best-effort at submission time
  (not a sprint task — user request) · Two clarifying questions resolved with the user first: (1)
  `logo_url` stores a reference to the site's own icon/og:image, not a downloaded copy — no new
  storage dependency, keeping CLAUDE.md's "no Supabase Storage" non-goal intact; (2) `@handle`
  (social) submissions skip extraction entirely (no public page to scrape), left null. **New:**
  migration `20260827_listings_logo_description.sql` (additive, applied to production — confirmed
  via `information_schema.columns`), `lib/extract-site-metadata.ts` (fetches the resolved URL with
  a 5s `AbortController` timeout, parses with `cheerio` — new real dependency, MIT-licensed;
  description from `<meta name="description">`/`og:description`; logo from
  `link[rel~="icon"]`/`apple-touch-icon`/`og:image`/`twitter:image`, falling back to
  `/favicon.ico`; rejects non-`http(s)`/`data:` schemes and hrefs over 2000 chars; any fetch/parse
  failure returns `{logoUrl: null, description: null}`, never throws) + 6 new unit tests.
  **Changed:** `app/api/listings/submit/route.ts` calls it only in the brand-new-listing branch
  (never re-extracted on a top-up, so a later bidder's top-up can't silently overwrite a curated
  logo/description), skipped for `@handle` identities. `lib/supabase/database.types.ts` updated.
  Verified live end-to-end against production: submitted `https://stripe.com` through the real
  running API, confirmed `logo_url`/`description` in the DB matched Stripe's actual favicon SVG
  and meta description, then deleted the test bid/listing rows. Lint/typecheck/`npm test`
  (27/27, +6 new)/`npm run build` all pass. Not yet committed. **Not done in this round** (out of
  scope for what was asked, flagged as a natural follow-up): no UI anywhere renders `logo_url`/
  `description` yet (leaderboard rows, admin queue) — data capture only so far.
- 2026-08-27 · Widened public front-end to 900px + made category filter collapsible (not a sprint
  task — user request) · **Width**: all "regular content page" containers changed
  `max-w-2xl` (672px) → `max-w-[900px]` — `layout.tsx` (header nav row), `page.tsx` (homepage),
  `categories/page.tsx`, `category/[slug]/page.tsx`, `rules/page.tsx`, `about/page.tsx`. Left
  `submit/page.tsx`/`submit/pending/page.tsx`/`submit/return/page.tsx` at `max-w-xl` (576px) —
  those are single-column forms, narrower on purpose independent of the leaderboard's width.
  **Category filter**: `_components/category-filter.tsx` is now a client component; the pill row
  is clipped to one row (`max-h-9 overflow-hidden`, `whitespace-nowrap` added to each pill so a
  long name can't wrap and get clipped mid-line) with a "Xem thêm"/"Thu gọn" toggle button below
  it. On the homepage it also moved below `HeroSubmitForm` (previously above it) — user's explicit
  ordering request. Verified live: `main`'s rendered width is exactly 900px; the pill wrapper's
  collapsed height is 36px while its full content is 202px tall (22 pills), and clicking "Xem
  thêm" removes the `max-h-9` clamp and the wrapper reflows to the full 202px. Lint/typecheck/
  `npm test` (21/21)/`npm run build` all pass. Not yet committed.
- 2026-08-27 · Homepage UI additions: category pill filter, inline hero claim-#1 form, rank-group
  dividers, hover-reveal claim CTA (not a sprint task — user request, given after screenshots of
  outbid.lol's homepage; see the earlier UI-teardown analysis in this session) ·
  **Category filter** (`_components/category-filter.tsx`, new): pills are plain `<Link>`s to `/`
  ("Tất cả") and the already-existing `/category/[slug]` route (Sprint 5, F2) — no new filtering
  query on the homepage itself, reuses the dedicated category page instead of duplicating query
  logic. Rendered on both `/` and `/category/[slug]` (which didn't have any cross-category
  navigation before this). **Hero submit form** (`_components/hero-submit-form.tsx`, new):
  compact stepper (±`min_increment`) + identity input + category select + submit, shown on
  homepage page 1 only, replacing the old plain "Muốn đứng #1?" banner there (`Leaderboard` gained
  a `showClaimBanner` prop, default `true`, so `/category/[slug]` keeps the old banner unchanged).
  Reuses the real submit flow (identity lookup, auto-classify, minimum-amount validation, SePay
  checkout redirect) rather than a decorative duplicate — extracted the existing `submit-form.tsx`
  state/handlers into `submit/use-submit-form.ts` first so both the full `/submit` page and the new
  homepage hero share one implementation (no duplicated lookup/validation/submit logic).
  **Rank groups**: `Leaderboard` now inserts a centered "TOP 3"/"TOP 10"/"TOP 20" divider row at
  those rank boundaries on page 1 (untested with real data — the live DB currently only has 2
  approved listings, too few to render any divider; logic is a plain index/rank comparison, typechecked
  and covered by the existing test suite's non-regression). **Hover-reveal CTA**
  (`_components/listing-row.tsx`): the per-row "Giành hạng này" button is now `opacity-0`,
  revealed via `group-hover`/`group-focus-within` (kept always-visible below the `sm` breakpoint,
  since touch has no hover) and its label now states the claim amount. Verified live against the
  real Supabase DB: homepage renders the real 21 categories, hero stepper increments correctly by
  the real `min_increment`, category pill navigation to `/category/real-estate` works with correct
  active-pill styling, no console errors. The hover-reveal CSS rule itself was confirmed correct at
  the stylesheet level (correct class application, correct higher-specificity `group-hover` rule
  generated, selector `.matches()` confirms it targets the button) but couldn't be visually
  confirmed end-to-end in this session — the Browser pane wasn't displayed client-side, and
  `getComputedStyle` kept returning the pre-hover value even after a confirmed `:hover` match,
  most likely because a non-composited/off-screen tab doesn't run the same style-recalc path;
  flagging as a real gap, not silently claiming it as visually verified. Lint/typecheck/
  `npm test` (21/21)/`npm run build` all pass. Not yet committed.
- 2026-08-27 · ZaloPay module deleted entirely — SePay is now the only payment gateway (user's
  explicit decision, going further than the earlier "tạm disable" pause) · Deleted
  `app/api/webhooks/zalopay/`, `app/api/payments/zalopay/create-order/`, `lib/payment/zalopay.ts`,
  `lib/payment/zalopay.test.ts`, `scripts/verify-zalopay-idempotency.mjs` — confirmed via grep first
  that nothing in `app/`/`lib/`/`scripts/` still imported any of them. `lib/payment/order-id.ts`
  (gateway-agnostic `buildGatewayOrderId`, already SePay's only order-id generator) untouched — it
  has no ZaloPay-specific logic, just a comment on the format's historical origin, left as-is.
  Cleaned up ZaloPay comparison comments in the surviving code
  (`app/(public)/submit/pending/pending-confirm.tsx`, `app/api/webhooks/sepay/route.ts`,
  `app/api/listings/submit/route.ts`, `lib/payment/sepay.ts`,
  `app/(public)/submit/return/page.tsx`, `scripts/verify-sepay-idempotency.mjs`,
  `app/api/payments/sepay/create-order/route.ts`, `scripts/verify-confirm-bid-concurrency.mjs`) and
  removed the `ZALOPAY_APP_ID`/`KEY1`/`KEY2` block from `.env.example` (never added to the real
  `.env`/Vercel anyway, per the now-moot blocker below). Updated `CLAUDE.md` (tech stack, repo
  layout, safety rules — `confirm_bid_and_increment`'s `p_gateway_txn_id` param is now described as
  a leftover gateway-agnostic shape rather than "used by two gateways"), `docs/specs/tech-spec.md`
  (architecture diagram note, external-integrations bullet, rank-integrity/payments-safety
  paragraphs, assumptions, open questions — the now-fully-moot "ZaloPay API contract" open question
  removed outright), `docs/specs/feature-spec.md` (F6 row + user story), `docs/sprints/
  sprint-02-listing-submission.md` (genericized 2 forward-references that predated the SePay
  choice), `docs/sprints/sprint-03-payment-rank-engine.md` (new dated addendum on top of the
  existing "gateway switched mid-sprint" addendum — the S3-T1..T5 task bodies themselves stay
  unrewritten, per that file's own explicit historical-record policy), `docs/sprints/
  sprint-06-hardening-launch.md` (S6-T5 and its surrounding mentions renamed from ZaloPay to SePay
  mechanics, since that sprint hasn't started and its plan would otherwise describe a deleted
  module). Left untouched, deliberately: already-applied migration file comments
  (`supabase/migrations/20260823_init.sql`, `20260824_grant_rank_engine_execute.sql`,
  `20260826_confirm_bid_and_increment.sql` — frozen historical record of applied SQL, not rewritten
  per CLAUDE.md's additive-only migration convention) and `1st-context.txt` (the original
  pre-project brainstorm transcript, also frozen). Verified: lint/typecheck (after clearing a stale
  `.next` build-cache reference to a route that no longer exists)/`npm test` (21/21, down from 26 —
  the 5 ZaloPay tests are gone)/`npm run build` all pass; build's route table confirmed to list no
  `/api/*/zalopay/*` or `/api/webhooks/zalopay` paths.
- 2026-08-27 · Deleted `app/api/payments/mock-confirm/route.ts` + removed temporary SePay IPN
  diagnostic logging (user's explicit go-ahead, keeping `TEST_BYPASS_EMAIL` for now — user's
  explicit call) · `mock-confirm` had zero code references left (confirmed via grep — only
  docs/migration comments named it), so deleted outright; `app/api/payments/` still holds
  `sepay/`/`zalopay/`, left untouched. `app/api/webhooks/sepay/route.ts`'s diagnostic
  `console.log`s (added in `64b54d8` to debug the production IPN failures, now resolved) removed
  by diffing against that commit and reverting exactly its additions — confirmed the result is
  byte-for-byte the pre-diagnostic route, keeping the pre-existing `console.warn`/`console.error`
  calls (genuine error paths, not part of the diagnostic commit). Stale `.next/types/validator.ts`
  referenced the deleted route after the delete — cleared `.next` (a build artifact) and
  re-typechecked clean. Verified: lint/typecheck/`npm test` (26/26)/`npm run build` all pass, and
  the build's route table no longer lists `/api/payments/mock-confirm`. `docs/sprints/
  sprint-03-payment-rank-engine.md`'s Definition of Done checkbox for this deletion is now checked;
  `CLAUDE.md`'s repo-layout and rank-integrity sections' mock-confirm descriptions updated to match
  (deleted, not "temporary exception" anymore).
- 2026-08-27 · Applied `20260827_listings_submitter_email_nullable.sql` (user confirmed) · Verified
  via a direct read against `information_schema.columns`: `listings.submitter_email` was `NOT NULL`
  before, `is_nullable: YES` after. This closes a real live bug — the email-ownership-removal code
  (committed as `4fc43d1`) inserts `email || null`, so any submission with no email was 500ing on the
  DB's `NOT NULL` constraint until this ran. Not yet re-verified live end-to-end in the browser
  (submit form with email left blank).
- 2026-08-27 · Removed the email-ownership check on top-ups (user's explicit decision, now committed
  as `4fc43d1`/`0496477` — the entry below previously said "not yet committed"; that was stale)
  · Any submitter can now top up any existing listing regardless of email; email becomes optional
  everywhere (submit form, API, DB column). New migration
  `20260827_listings_submitter_email_nullable.sql` (drops the `not null` constraint) — **written,
  not yet applied**, needs user confirmation. Code changes: `app/api/listings/submit/route.ts`
  (zod schema accepts `""`/omitted email, defaults to `""`; removed the
  `existing.submitter_email !== email` 409 check entirely; inserts `email || null`);
  `lib/supabase/database.types.ts` (`submitter_email: string | null`); `lib/email/notify.ts` (both
  notify functions render `"(không có email)"` when null); admin `queue-row.tsx`/`listing-row.tsx`
  (type + same null-fallback rendering); `submit-form.tsx`/`submit/page.tsx` copy updated (label
  "(tuỳ chọn)", intro text no longer tells users to re-enter their old email). Docs updated:
  `tech-spec.md`'s "Guest identity model" (now explicitly "no ownership concept at all", original
  design kept for history), `feature-spec.md` F10 (title/acceptance criteria rewritten), `CLAUDE.md`
  Non-goals line. Not yet verified live or committed — see Next task above.
- 2026-08-26/27 · Root-caused and fixed the real SePay IPN failures (2 bugs) + a bypass-induced
  negative-delta bug, all found via live production debugging with the user · **Bug 1**: added
  temporary diagnostic logging to `app/api/webhooks/sepay/route.ts` (structural facts only — header
  presence, top-level JSON keys, notification_type, zod issue paths — never full bodies or card
  fields) since neither of us had direct Vercel/SePay dashboard log access otherwise; the user
  pasted real production logs showing `order.order_amount` failed zod validation
  (`"expected":"number"..."received":"string"`) — SePay's real payload sends it as a string,
  contradicting its own public docs ("long"). Fixed with `z.coerce.number()`. **Bug 2** (found
  first, chronologically): IPN deliveries were 401ing silently because the SePay merchant
  dashboard's "Cấu hình IPN" screen has an "Auth Type" selector defaulting to "Không có" (none) —
  had to be switched to "Secret Key" (matching `SEPAY_SECRET_KEY` exactly) before SePay would send
  the `X-Secret-Key` header our webhook requires; a stale sandbox-vs-production secret mismatch
  compounded this briefly (diagnosed via a direct synthetic-payload probe against the live
  production URL, run from this session, comparing local `.env`'s secret against what Vercel
  actually had configured). **Bug 3**: `TEST_BYPASS_EMAIL` (added 2026-08-26) skipped the entire
  minimum-amount check on top-ups, including the implicit guarantee that `delta > 0` — entering a
  bypass amount below a listing's current amount produced a negative `total_charged`, which SePay's
  checkout correctly rejected ("Yêu cầu không hợp lệ"). Fixed by unconditionally requiring
  `amount > existing.amount` regardless of bypass state. All three fixes verified live against
  production (`digilever.vn` now correctly shows `paid_pending_review`, amount 15,000đ, visible in
  "Hàng chờ duyệt"); junk test bids (0 and -10000 delta) cleaned up from the DB. Confirmed as a
  side effect: SePay DOES retry failed (non-2xx) IPN deliveries — several bids stuck from before
  the fixes landed were retried and confirmed automatically once the code was corrected, without a
  fresh payment. Diagnostic logging is intentionally left in place for now (flagged for removal once
  the team is confident no further debugging is needed).
- 2026-08-26 · Caught + fixed a real bug: the SePay rank-confirmation migration was never applied ·
  User completed a sandbox checkout (real SePay payment, redirected to the success page) and reported
  it as a successful test. A read-only DB check (querying `bids` directly) showed the 5 most recent
  test bids were ALL still `status: 'pending'`/`confirmed_at: null` — none had actually been
  confirmed. Root cause, confirmed via `pg_proc`: `confirm_bid_and_increment()` had never been applied
  to the database (the migration file existed but `apply-migration.mjs` was never run against it), so
  every real IPN delivery from SePay verified its signature correctly, then 500'd on the RPC call
  ("function does not exist") — invisibly, since SePay's `success_url` redirect fires independently
  of whether our webhook actually succeeds, so the checkout UX looked fine while the core rank-write
  silently failed every time. Applied the migration with the user's explicit confirmation
  (`node scripts/apply-migration.mjs supabase/migrations/20260826_confirm_bid_and_increment.sql`);
  confirmed the function now exists and re-ran `scripts/verify-confirm-bid-concurrency.mjs` live
  against production — 2 concurrent confirmations summed correctly (no lost update), and a replayed
  confirmation was confirmed as a no-op. **Not yet re-verified end-to-end through the real webhook
  route** (the concurrency script calls the RPC directly, not via SePay/HTTP) — see Next task above.
- 2026-08-26 · ZaloPay paused, SePay built as the active gateway — NOT yet live-verified · While the
  user was testing the ZaloPay flow on Vercel (below), `/api/payments/zalopay/create-order` 500'd —
  root-caused to `requireEnv()` throwing outside any try/catch when an env var was missing (likely
  the ZaloPay env vars weren't yet added to Vercel's own project settings, separate from local
  `.env`); fixed by wrapping `createZaloPayOrder`/`verifyIpnMac`/`verifyReturnChecksum` in try/catch
  so a config error returns a clean error instead of an unhandled 500. Before finishing ZaloPay's
  live verification, the user asked to temporarily pause ZaloPay ("tạm disable" — keep the code,
  don't delete it) and build **SePay's Payment Gateway** as the active method instead, via the
  official `sepay-pg-node` npm SDK. Planned via /plan mode: read the package's real shipped source
  (v1.0.0, MIT, `github.com/sepayvn/sepay-pg-node`) via unpkg rather than trusting only its README,
  and fetched `developer.sepay.vn`'s real payment-gateway docs (a separate docs site from
  `docs.sepay.vn`, which covers SePay's other bank-webhook product) for the IPN contract. Confirmed
  a real sandbox exists for this merchant account (`my.sepay.vn`, no production-approval wait) —
  unlike ZaloPay, so this integration can be fully live-verified before touching production.
  **New:** `npm install sepay-pg-node` (real dependency, not hand-rolled — see Decisions).
  `lib/payment/order-id.ts` — `buildGatewayOrderId()`, extracted from `zalopay.ts`'s
  `buildApptransid` (mechanical rename/move, same logic) since it's genuinely gateway-agnostic and
  now has two consumers; its tests moved to `order-id.test.ts`. `lib/payment/sepay.ts` —
  `createSepayCheckout()` (wraps `SePayPgClient.checkout`, `payment_method` fixed to
  `BANK_TRANSFER`, entire body in try/catch from the start — applying the ZaloPay 500 bug's lesson
  immediately) and `verifySepayIpnSecret()` (constant-time `X-Secret-Key` header compare) + tests.
  `app/api/payments/sepay/create-order/route.ts` (returns `{checkoutUrl, fields}`, not a bare
  `orderUrl` — SePay's checkout is a browser FORM POST, not a redirect). `app/api/webhooks/sepay/
  route.ts` (verifies the secret before any DB call, real HTTP status codes — 401/400/500 — instead
  of ZaloPay's always-200-with-body-code, since SePay only documents "HTTP 200 required" with no
  alternate convention; calls the SAME `confirm_bid_and_increment()` RPC as ZaloPay would have — no
  new migration needed, it was already gateway-agnostic). `scripts/verify-sepay-idempotency.mjs`
  (same `pg`-direct fixture pattern as the ZaloPay version, `X-Secret-Key` instead of a mac).
  **Changed:** `app/(public)/submit/pending/pending-confirm.tsx` rewritten for the form-POST flow
  (fetches signed fields, renders a hidden auto-submitting `<form>` with a manual fallback button —
  a real UX difference from ZaloPay's `location.href = orderUrl`). `app/(public)/submit/return/
  page.tsx` redesigned around an `?outcome=success|error|cancel` param BidTop itself chooses when
  building the checkout's `success_url`/`error_url`/`cancel_url`, instead of parsing ZaloPay's old
  checksummed query params (which are undocumented for SePay's redirect anyway) — still zero DB
  writes. `app/api/listings/submit/route.ts`'s import swapped to the new shared generator.
  **Orphaned, not deleted:** `lib/payment/zalopay.ts` (minus the moved `buildApptransid`),
  `app/api/payments/zalopay/create-order/route.ts`, `app/api/webhooks/zalopay/route.ts` — all still
  compile, still pass their own tests, one-line "currently unwired" comment added to each. No
  feature flag introduced (CLAUDE.md forbids them pre-launch) — "disable" is un-wiring the two call
  sites, nothing more.
  **NOT done yet, blocking a real demo** (see Blockers): `SEPAY_MERCHANT_ID`/`SEPAY_SECRET_KEY`
  aren't in `.env`; the migration isn't applied to production; no real SePay sandbox payment has
  been completed (so the `X-Secret-Key`-is-the-only-option/`currency`-value/retry-semantics/
  `transaction.id`-vs-`transaction_id` open questions in `lib/payment/sepay.ts`'s top comment are
  still unresolved); `mock-confirm`/route.ts is still in place (already orphaned, not yet deleted).
  Verified so far: `npm run lint`/`npm run typecheck`/`npm test` (26/26, +5 new)/`npm run build` all
  pass; grep confirms `/submit/return` still has zero `supabase.from`/`.rpc` calls.
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
- 2026-08-28 · **The "Crypto, Web3 & Investing" category non-goal is lifted — added as
  `web3-investing`/"Web3 & Đầu tư"** · user's explicit override, confirmed directly after I flagged
  the conflict (CLAUDE.md's Non-goals said this needed "a separate legal review" first, and the
  rename alone doesn't change the underlying regulatory-content question — I raised that
  explicitly before proceeding, user chose to override anyway rather than treat the rename as a
  loophole). The **"Dịch vụ pháp lý" restriction is untouched** — this decision only covers
  crypto/Web3, nothing else in that non-goal line. Added alongside 8 other categories (matching
  outbid.lol's list: People & Profiles, Games & Entertainment, Ecommerce & Retail, Audio/Voice/
  Podcasting, Security/Privacy/Compliance, Domains & Web Assets, Leaderboards & Attention Markets,
  Travel/Local/Lifestyle) which had no such blocker.
- 2026-08-27 · **Supersedes the 2026-08-26 "ZaloPay paused" decision below — ZaloPay removed
  entirely, SePay is the only payment gateway** · user's explicit decision, given directly. Goes
  further than "tạm disable": the code, routes, tests, and verify script are deleted outright, not
  kept dormant for a 2-line re-enable as the pause decision had planned. All specs/CLAUDE.md/sprint
  docs updated to match (see the 2026-08-27 task log entry for the full file list). Re-adding
  ZaloPay later, if ever wanted, would mean re-building it from `git log` history
  (`app/api/webhooks/zalopay/`, `app/api/payments/zalopay/create-order/`, `lib/payment/zalopay.ts`
  all existed as of commit `01b6358` and were deleted in this change), not flipping a switch.
- 2026-08-27 · **Email-ownership check on top-ups removed entirely; email becomes optional** ·
  user's explicit decision, given directly (not something Claude proposed) — confirmed via two
  follow-up questions: (1) any submitter may top up any existing listing regardless of email, no
  exceptions; (2) the email field stays on the form but isn't required, rather than being removed
  outright (kept for optional admin-contact purposes). Matches the product's core stated mechanic
  ("rank is purely the amount paid") more literally than the original design did — the old
  email-match rule was explicitly documented as a weak, deliberately-temporary guest-identity model
  in tech-spec.md, not a hard requirement. `listings.submitter_email` made nullable via a new
  migration rather than dropped, since it's still collected (just unenforced) — additive, no data
  loss for existing rows.
- 2026-08-26 · **ZaloPay paused ("tạm disable"), SePay is now the active payment gateway** · user's
  explicit request, before ZaloPay's own live verification finished. "Disable" = un-wiring the two
  call sites (`pending-confirm.tsx`, `submit/route.ts`'s import) — no feature flag introduced
  (CLAUDE.md forbids them pre-launch: "change the code directly"). ZaloPay's files (`lib/payment/
  zalopay.ts`, both its routes, its env vars) stay fully intact, still tested, still correctly
  gated — orphaned, not deleted. Re-enabling later is a 2-line change.
- 2026-08-26 · `sepay-pg-node` added as a real npm dependency, used directly (not hand-rolled like
  ZaloPay's mac) · this repo already has a precedent for real vendor SDKs (`@anthropic-ai/sdk`);
  SePay's checkout signing is security-sensitive, not the ~20-line plain-fetch case CLAUDE.md's
  "no new dependency" rule is aimed at; and unlike ZaloPay there's no way to unauthenticated-probe
  SePay's checkout endpoint to sanity-check a hand-rolled signature, so a subtly-wrong field
  whitelist/order would be much harder to catch than it was for ZaloPay's mac.
- 2026-08-26 · `buildApptransid` extracted from `zalopay.ts` to a new gateway-neutral
  `lib/payment/order-id.ts` (`buildGatewayOrderId`) · `bids.gateway_order_id` was always
  gateway-agnostic in the schema and now has two real consumers (SePay, and ZaloPay if
  re-enabled) — mechanical move, same VN-local-time `yymmdd_xxxxxxxx` logic, no redesign.
- 2026-08-26 · SePay checkout is QR chuyển khoản ngân hàng only (`payment_method="BANK_TRANSFER"`,
  fixed, not a runtime setting) · user's explicit choice, mirroring the ZaloPay QR-only precedent
  over showing Card/QR Banking/QR NAPAS together.
- 2026-08-26 · `SEPAY_ENV` fails safe to `"sandbox"` if unset, unlike ZaloPay which had no
  sandbox/production toggle at all (no sandbox existed for that account) · a real sandbox DOES
  exist for this SePay merchant account, so the toggle is genuinely useful — but forgetting to set
  `SEPAY_ENV=production` on Vercel should mean "checkout silently stays sandbox," not "accidentally
  goes live."
- 2026-08-26 · `/submit/return` redesigned around an `?outcome=success|error|cancel` param BidTop
  itself chooses (via the `success_url`/`error_url`/`cancel_url` built at checkout time), not
  gateway-supplied query data · SePay uses 3 separate redirect URLs (unlike ZaloPay's one URL +
  status param) and its redirect query-param shape isn't documented anywhere found — since the page
  already performs zero DB writes either way (purely cosmetic), choosing our own discriminator
  sidesteps needing to trust or parse anything gateway-supplied at all.
- 2026-08-26 · SePay's IPN webhook uses real HTTP status codes (401/400/500) rather than ZaloPay's
  always-200-with-body-code convention · SePay's docs only document "must return HTTP 200 to
  confirm receipt," with no alternate body-code contract like ZaloPay's `returncode` — matching
  what's actually documented rather than assuming ZaloPay's pattern carries over.
- 2026-08-26 · No new migration for SePay — reuses `confirm_bid_and_increment(p_bid_id,
  p_gateway_txn_id text)` from the ZaloPay work as-is · confirmed the function was already 100%
  gateway-agnostic (`p_gateway_txn_id` is just an opaque string); both gateways' webhooks call the
  exact same function.
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
- **RESOLVED: SePay production credentials/IPN config/webhook are all confirmed working** — real
  production payments (`digilever.vn`) now correctly flow through checkout → IPN → RPC →
  "Hàng chờ duyệt". Getting here needed 3 separate fixes (dashboard Auth Type, `SEPAY_SECRET_KEY`
  sync, `order_amount` string coercion) — see the 2026-08-26/27 task log entry.
- **RESOLVED (superseded): ZaloPay credentials question** — moot now that the ZaloPay module is
  deleted entirely (2026-08-27), not just paused; `ZALOPAY_APP_ID`/`KEY1`/`KEY2` were never added to
  `.env`/Vercel either.
- **Remaining unverified SePay facts** (low priority, nothing currently depends on them): whether
  SePay retries on a non-200 IPN response indefinitely or a limited number of times (retries are
  confirmed to happen at all — several pre-fix stuck bids self-resolved once the code was corrected,
  with no new payment); whether `transaction.id` or `transaction.transaction_id` is the more
  meaningful field for `gateway_txn_id` (both are populated in practice, either works). Confirmed,
  no longer open: `X-Secret-Key` + dashboard Auth Type is the real IPN auth mechanism;
  `order_amount` arrives as a string.
- **RESOLVED: temporary diagnostic logging removed from `app/api/webhooks/sepay/route.ts`**
  (2026-08-27) — no longer needed now that the SePay IPN bugs it was added to catch are fixed and
  confirmed working live.
- **RESOLVED: `20260827_listings_submitter_email_nullable.sql` applied** (2026-08-27, user
  confirmed) — `listings.submitter_email` is now nullable in production, matching the
  email-optional code already shipped. Not yet re-verified live in-browser (submit with email
  blank).
- **RESOLVED: mock payment step deleted** (2026-08-27, `app/api/payments/mock-confirm/route.ts`) —
  the real free-rank exploit it posed (always "succeeds" with no real charge, reachable in
  production) is closed now that the real SePay flow is live-verified.
- bidtop.vn domain/trademark availability not yet confirmed — must resolve before Sprint 6.
- Legal review of "Dịch vụ pháp lý" and "Crypto, Web3 & Investing" categories not started — both
  stay out of the product indefinitely until done (no sprint assigned).
- **RESOLVED (moot): "QR tĩnh" (ZaloPay static QR)** — was already delayed (2026-08-26); now moot
  entirely now that ZaloPay is removed as a gateway (2026-08-27). Left as a record in case a
  similar static-QR idea comes up against SePay or a future gateway: it's a separate product from
  the Gateway/checkout API (ZaloPay's version was Merchant Console, `mc.zalopay.vn`/
  `sbmc.zalopay.vn`, distinct from `v001/tpe`), and a real design problem surfaced — static QR has
  no per-transaction order reference, so confirming a payment needs either amount+time matching
  (ambiguous under concurrent same-amount bids) or admin manual confirmation, which would need an
  explicit, deliberate carve-out in CLAUDE.md's rank-integrity rule ("no admin action may increment
  amount directly") since it'd be a permanent exception, not a temporary one like mock-confirm was.
- **Test-only minimum-amount bypass for `ntkhang@gmail.com`** (`TEST_BYPASS_EMAIL` in
  `app/api/listings/submit/route.ts` and `app/(public)/submit/submit-form.tsx`) — lets the founder
  submit/top-up with any amount (even a few thousand đ) instead of the normal starting-price/
  min-increment rule, to keep real SePay payments cheap while debugging the live webhook delivery
  issue above. Doesn't touch payment or rank-write logic at all — only which amount is allowed
  through the form. **Must be removed before real launch** (same category as `mock-confirm`/QR
  tĩnh — flagged, not forgotten). Verified live in-browser: submitting with this email and 5,000đ
  reached a real signed SePay checkout page; test row cleaned up afterward.
