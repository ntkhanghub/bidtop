import Link from "next/link";
import { supabase } from "@/lib/supabase/server";
import { timeAgoVi } from "@/lib/time-ago";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "./category-icons";

export const revalidate = 30;

// How many top listings to preview per category card — env-configurable so
// it can be tuned without a code change; defaults to 1 per the user's
// explicit call.
const TOP_LISTINGS_COUNT = Number(process.env.CATEGORY_TOP_LISTINGS_COUNT) || 1;
const MOST_ACTIVE_COUNT = 3;

export default async function CategoriesPage() {
  const [{ data: categories }, { data: approvedListings }, { data: confirmedBids }] =
    await Promise.all([
      supabase.from("categories").select("id, slug, name_vi").order("sort_order"),
      supabase.from("listings").select("id, category_id").eq("status", "approved"),
      supabase.from("bids").select("listing_id, confirmed_at").eq("status", "confirmed"),
    ]);

  const listingCategoryMap = new Map((approvedListings ?? []).map((l) => [l.id, l.category_id]));
  const activity = new Map<string, { count: number; latest: string }>();
  for (const bid of confirmedBids ?? []) {
    const categoryId = listingCategoryMap.get(bid.listing_id);
    if (!categoryId || !bid.confirmed_at) continue;
    const existing = activity.get(categoryId);
    if (existing) {
      existing.count += 1;
      if (bid.confirmed_at > existing.latest) existing.latest = bid.confirmed_at;
    } else {
      activity.set(categoryId, { count: 1, latest: bid.confirmed_at });
    }
  }

  const mostActive = (categories ?? [])
    .map((c) => ({ ...c, activity: activity.get(c.id) }))
    .filter((c): c is typeof c & { activity: { count: number; latest: string } } => !!c.activity)
    .sort((a, b) => b.activity.count - a.activity.count)
    .slice(0, MOST_ACTIVE_COUNT);

  const topListingsByCategory = await Promise.all(
    (categories ?? []).map((c) =>
      supabase
        .from("listings")
        .select("id, display_url, title, logo_url, amount")
        .eq("category_id", c.id)
        .eq("status", "approved")
        .order("amount", { ascending: false })
        .order("first_confirmed_at", { ascending: true })
        .limit(TOP_LISTINGS_COUNT),
    ),
  );

  return (
    <main className="mx-auto max-w-[900px] px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">Danh mục</h1>
      <p className="mt-1 text-muted-foreground">
        Mỗi danh mục có bảng xếp hạng riêng. Chọn một danh mục để xem ai đang dẫn đầu.
      </p>

      {mostActive.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-live" />
            <h2 className="text-sm font-semibold text-foreground">Danh mục sôi động nhất</h2>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {mostActive.map((c) => {
              const Icon = CATEGORY_ICONS[c.slug] ?? DEFAULT_CATEGORY_ICON;
              return (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 hover:bg-muted"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{c.name_vi}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.activity.count} lượt giành hạng · {timeAgoVi(c.activity.latest)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {(categories ?? []).map((c, i) => {
          const Icon = CATEGORY_ICONS[c.slug] ?? DEFAULT_CATEGORY_ICON;
          const topListings = topListingsByCategory[i].data ?? [];
          return (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="rounded-xl border border-border bg-card p-4 hover:border-accent"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Icon className="size-4" />
                </span>
                <h3 className="min-w-0 truncate font-medium text-foreground">{c.name_vi}</h3>
              </div>

              {topListings.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Chưa có listing nào.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {topListings.map((l, rank) => (
                    <li key={l.id} className="flex min-w-0 items-center gap-2 text-sm">
                      <span className="w-5 shrink-0 text-xs text-muted-foreground">#{rank + 1}</span>
                      <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-[10px] text-muted-foreground">
                        {l.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.logo_url} alt="" className="size-full object-contain" />
                        ) : (
                          (l.title ?? l.display_url).charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {l.title ?? l.display_url}
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {l.amount.toLocaleString("vi-VN")}đ
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
