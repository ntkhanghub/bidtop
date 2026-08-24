import Link from "next/link";
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
      <p className="mt-4 text-neutral-500">
        Chưa có listing nào được duyệt. Rank là số tiền đã trả — không gì khác.
      </p>
    );
  }

  const topClaimAmount =
    page === 1 && listings.length > 0 ? listings[0].amount + minIncrement : startingPrice;

  return (
    <div>
      {page === 1 && (
        <div className="mt-4 flex items-center justify-between rounded border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500">
          <span>Muốn đứng #1?</span>
          <Link href={`/submit?amount=${topClaimAmount}`} className="font-medium text-neutral-900 hover:underline">
            Giành hạng #1
          </Link>
        </div>
      )}
      <ol className="mt-2 divide-y divide-neutral-200">
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
            <Link href={pageHref(page - 1)} className="text-neutral-500 hover:text-neutral-900">
              ← Trước
            </Link>
          )}
          <span className="text-neutral-500">
            Trang {page}/{totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="text-neutral-500 hover:text-neutral-900">
              Sau →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
