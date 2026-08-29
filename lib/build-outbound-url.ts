// Same UTM params the old /out/[id] redirect used to append server-side —
// now baked directly into the real destination href (see CLAUDE.md: listing
// links point straight at the destination for a real dofollow backlink,
// click tracking moved to a separate POST instead of a redirect hop).
export function buildOutboundUrl(displayUrl: string): string {
  const url = new URL(displayUrl);
  url.searchParams.set("utm_source", "bidtop");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "leaderboard");
  return url.toString();
}
