import Link from "next/link";

type Listing = { id: string; display_url: string; amount: number };

export function ListingRow({
  listing,
  rank,
  minIncrement,
}: {
  listing: Listing;
  rank: number;
  minIncrement: number;
}) {
  const claimAmount = listing.amount + minIncrement;

  return (
    <li className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <span className="w-8 text-right text-neutral-400">#{rank}</span>
        <a href={`/out/${listing.id}`} className="text-neutral-900 hover:underline">
          {listing.display_url}
        </a>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-neutral-500">{listing.amount.toLocaleString("vi-VN")}đ</span>
        <Link
          href={`/submit?amount=${claimAmount}`}
          className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline"
        >
          Giành hạng này
        </Link>
      </div>
    </li>
  );
}
