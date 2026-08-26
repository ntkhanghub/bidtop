import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingRow } from "./listing-row";

type Listing = { id: string; display_url: string; amount: number };

export function Leaderboard({
  listings,
  page,
  pageSize,
  totalPages,
  minIncrement,
  startingPrice,
  baseHref,
}: {
  listings: Listing[];
  page: number;
  pageSize: number;
  totalPages: number;
  minIncrement: number;
  startingPrice: number;
  baseHref: string;
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

  return (
    <div>
      {page === 1 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <span>Muốn đứng #1?</span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/submit?amount=${topClaimAmount}`}>Giành hạng #1</Link>
          </Button>
        </div>
      )}
      <ol className="mt-2 divide-y divide-border">
        {listings.map((listing, index) => (
          <ListingRow
            key={listing.id}
            listing={listing}
            rank={(page - 1) * pageSize + index + 1}
            minIncrement={minIncrement}
          />
        ))}
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
