import { getClickCounts } from "@/lib/get-click-counts";
import { supabase } from "@/lib/supabase/server";
import { CategoryFilter } from "./_components/category-filter";
import { HeroSubmitForm } from "./_components/hero-submit-form";
import { Leaderboard } from "./_components/leaderboard";

// Cached, revalidated every 30s rather than fully static or fully dynamic —
// matches the tech-spec's read-heavy NFR (leaderboard renders < 1s on the cached
// path) while still reflecting new/topped-up listings within a bounded delay.
export const revalidate = 30;

const PAGE_SIZE = 50;
const ACTIVITY_FEED_SIZE = 5;

async function computeRank(listingId: string, amount: number, firstConfirmedAt: string) {
  const [{ count: greater }, { count: tie }] = await Promise.all([
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .gt("amount", amount),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("amount", amount)
      .lt("first_confirmed_at", firstConfirmedAt),
  ]);
  return (greater ?? 0) + (tie ?? 0) + 1;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [
    { data: listings, count, error },
    { data: settingsRows },
    { data: confirmedBids },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, display_url, amount, title, logo_url, description, category_id, created_at",
        { count: "exact" },
      )
      .eq("status", "approved")
      .order("amount", { ascending: false })
      .order("first_confirmed_at", { ascending: true })
      .range(from, to),
    supabase
      .from("settings")
      .select("key, value")
      .in("key", ["min_increment", "starting_price", "show_click_count"]),
    supabase
      .from("bids")
      .select("id, listing_id, delta_amount, confirmed_at")
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: false })
      .limit(ACTIVITY_FEED_SIZE),
    supabase.from("categories").select("id, slug, name_vi").order("sort_order"),
  ]);

  if (error) throw error;

  const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, s.value]));
  const categoryMap = Object.fromEntries(
    (categories ?? []).map((c) => [c.id, { slug: c.slug, name: c.name_vi }]),
  );

  const feedListingIds = [...new Set((confirmedBids ?? []).map((b) => b.listing_id))];
  const { data: feedListings } =
    feedListingIds.length > 0
      ? await supabase
          .from("listings")
          .select("id, display_url, title, logo_url, amount, first_confirmed_at")
          .in("id", feedListingIds)
      : { data: [] };
  const feedListingMap = new Map((feedListings ?? []).map((l) => [l.id, l]));

  const activityItems = await Promise.all(
    (confirmedBids ?? [])
      .filter((b) => feedListingMap.has(b.listing_id))
      .map(async (b) => {
        const listing = feedListingMap.get(b.listing_id)!;
        const rank = await computeRank(listing.id, listing.amount, listing.first_confirmed_at!);
        return {
          id: b.id,
          displayUrl: listing.display_url,
          title: listing.title,
          logoUrl: listing.logo_url,
          deltaAmount: b.delta_amount,
          rank,
          confirmedAt: b.confirmed_at!,
        };
      }),
  );

  const clickCounts = await getClickCounts((listings ?? []).map((l) => l.id));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const minIncrement = Number(settings.min_increment ?? 50000);
  const startingPrice = Number(settings.starting_price ?? 100000);
  const showClickCount = settings.show_click_count === "true";
  const topClaimAmount =
    page === 1 && (listings ?? []).length > 0 ? listings![0].amount + minIncrement : startingPrice;

  return (
    <main className="mx-auto max-w-[900px] px-4 py-12">
      <p className="mt-1 text-muted-foreground">Rank là số tiền đã trả — không gì khác.</p>
      {page === 1 && (
        <HeroSubmitForm
          categories={categories ?? []}
          initialAmount={topClaimAmount}
          minIncrement={minIncrement}
          startingPrice={startingPrice}
        />
      )}
      <CategoryFilter categories={categories ?? []} />
      <Leaderboard
        listings={listings ?? []}
        page={page}
        pageSize={PAGE_SIZE}
        totalPages={totalPages}
        minIncrement={minIncrement}
        startingPrice={startingPrice}
        baseHref="/"
        showClaimBanner={false}
        categoryMap={categoryMap}
        clickCounts={clickCounts}
        showClickCount={showClickCount}
        activityItems={page === 1 ? activityItems : undefined}
      />
    </main>
  );
}
