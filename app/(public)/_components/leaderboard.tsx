import { Fragment } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "./activity-feed";
import { ListingRow } from "./listing-row";

type Listing = {
  id: string;
  display_url: string;
  amount: number;
  title: string | null;
  logo_url: string | null;
  description: string | null;
  category_id: string;
  updated_at: string;
};
type ActivityItem = {
  id: string;
  displayUrl: string;
  title: string | null;
  logoUrl: string | null;
  deltaAmount: number;
  rank: number;
  confirmedAt: string;
};

function MilestoneDivider({ rank }: { rank: number }) {
  return (
    <li className="flex items-center gap-3 py-4">
      <span className="h-px flex-1 bg-border" />
      <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
        TOP {rank}
      </span>
      <span className="h-px flex-1 bg-border" />
    </li>
  );
}

export function Leaderboard({
  listings,
  page,
  pageSize,
  totalPages,
  minIncrement,
  startingPrice,
  baseHref,
  showClaimBanner = true,
  categoryMap,
  clickCounts,
  activityItems,
}: {
  listings: Listing[];
  page: number;
  pageSize: number;
  totalPages: number;
  minIncrement: number;
  startingPrice: number;
  baseHref: string;
  showClaimBanner?: boolean;
  categoryMap: Record<string, { slug: string; name: string }>;
  clickCounts: Record<string, number>;
  activityItems?: ActivityItem[];
}) {
  function pageHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  }

  if (listings.length === 0 && page === 1) {
    return (
      <p className="mt-4 text-muted-foreground">
        Chưa có listing nào được duyệt. Rank là số tiền đã trả — không gì khác.
      </p>
    );
  }

  const topClaimAmount =
    page === 1 && listings.length > 0 ? listings[0].amount + minIncrement : startingPrice;

  const milestones = page === 1 ? [3, 10, 20] : [];

  return (
    <div>
      {page === 1 && showClaimBanner && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <span>Muốn đứng #1?</span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/submit?amount=${topClaimAmount}`}>Giành hạng #1</Link>
          </Button>
        </div>
      )}
      <ol className="mt-2 divide-y divide-border">
        {listings.map((listing, index) => {
          const rank = (page - 1) * pageSize + index + 1;
          return (
            <Fragment key={listing.id}>
              <ListingRow
                listing={listing}
                rank={rank}
                minIncrement={minIncrement}
                category={categoryMap[listing.category_id] ?? { slug: "other", name: "—" }}
                clickCount={clickCounts[listing.id] ?? 0}
              />
              {rank === 3 && activityItems && activityItems.length > 0 && (
                <li>
                  <ActivityFeed items={activityItems} />
                </li>
              )}
              {milestones.includes(rank) && index < listings.length - 1 && (
                <MilestoneDivider rank={rank} />
              )}
            </Fragment>
          );
        })}
      </ol>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>
                <ChevronLeft /> Trước
              </Link>
            </Button>
          )}
          <span className="text-muted-foreground">
            Trang {page}/{totalPages}
          </span>
          {page < totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>
                Sau <ChevronRight />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
