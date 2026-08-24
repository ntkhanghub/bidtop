import { supabase } from "@/lib/supabase/server";
import { ActivityFeed } from "./_components/activity-feed";
import { Leaderboard } from "./_components/leaderboard";

// Cached, revalidated every 30s rather than fully static or fully dynamic —
// matches the tech-spec's read-heavy NFR (leaderboard renders < 1s on the cached
// path) while still reflecting new/topped-up listings within a bounded delay.
export const revalidate = 30;

const PAGE_SIZE = 50;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ data: listings, count, error }, { data: settingsRows }, { data: confirmedBids }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("id, display_url, amount", { count: "exact" })
        .eq("status", "approved")
        .order("amount", { ascending: false })
        .order("first_confirmed_at", { ascending: true })
        .range(from, to),
      supabase.from("settings").select("key, value").in("key", ["min_increment", "starting_price"]),
      supabase
        .from("bids")
        .select("id, listing_id, delta_amount")
        .eq("status", "confirmed")
        .order("confirmed_at", { ascending: false })
        .limit(15),
    ]);

  if (error) throw error;

  const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, Number(s.value)]));

  const feedListingIds = [...new Set((confirmedBids ?? []).map((b) => b.listing_id))];
  const { data: feedListings } =
    feedListingIds.length > 0
      ? await supabase.from("listings").select("id, display_url").in("id", feedListingIds)
      : { data: [] };
  const feedListingMap = new Map((feedListings ?? []).map((l) => [l.id, l.display_url]));
  const activityItems = (confirmedBids ?? [])
    .filter((b) => feedListingMap.has(b.listing_id))
    .map((b) => ({
      id: b.id,
      displayUrl: feedListingMap.get(b.listing_id)!,
      deltaAmount: b.delta_amount,
    }));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">BidTop.vn</h1>
      <p className="mt-1 text-neutral-500">Rank là số tiền đã trả — không gì khác.</p>
      <Leaderboard
        listings={listings ?? []}
        page={page}
        pageSize={PAGE_SIZE}
        totalPages={totalPages}
        minIncrement={settings.min_increment ?? 50000}
        startingPrice={settings.starting_price ?? 100000}
        baseHref="/"
      />
      {page === 1 && <ActivityFeed items={activityItems} />}
    </main>
  );
}
