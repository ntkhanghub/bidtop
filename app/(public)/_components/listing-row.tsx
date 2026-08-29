import Link from "next/link";
import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buildOutboundUrl } from "@/lib/build-outbound-url";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "@/lib/category-icons";
import { timeAgoVi } from "@/lib/time-ago";
import { cn } from "@/lib/utils";
import { TrackedLink } from "./tracked-link";

type Listing = {
  id: string;
  display_url: string;
  amount: number;
  title: string | null;
  logo_url: string | null;
  description: string | null;
  updated_at: string;
};
type Category = { slug: string; name: string };

export function ListingRow({
  listing,
  rank,
  minIncrement,
  category,
  clickCount,
}: {
  listing: Listing;
  rank: number;
  minIncrement: number;
  category: Category;
  clickCount: number;
}) {
  const claimAmount = listing.amount + minIncrement;
  const isTopRank = rank === 1;
  const bareUrl = listing.display_url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const CategoryIcon = CATEGORY_ICONS[category.slug] ?? DEFAULT_CATEGORY_ICON;

  // Border/tint fades out from rank #1 (boldest) to #3 (faintest); ranks
  // below #3 get no special treatment.
  const topBorderStyles: Record<number, string> = {
    1: "border-accent bg-accent/10",
    2: "border-accent/50 bg-accent/5",
    3: "border-accent/25 bg-accent/[0.02]",
  };

  return (
    <li
      className={cn(
        "group relative flex items-start gap-3 py-4",
        topBorderStyles[rank] && cn("my-2 rounded-xl border px-3", topBorderStyles[rank])
      )}
    >
      {/* Full-card link to the real destination — a real dofollow backlink
          (server-rendered href, not a same-origin redirect), so it must
          stay a plain <a> pointed straight at the site. Click tracking
          happens via TrackedLink's onClick, not a redirect hop. */}
      <TrackedLink
        listingId={listing.id}
        href={buildOutboundUrl(listing.display_url)}
        target="_blank"
        rel="noopener"
        aria-label={`Truy cập ${listing.title ?? listing.display_url}`}
        className="absolute inset-0 z-0 rounded-[inherit]"
      />

      <div className="relative z-10 flex min-w-0 flex-1 items-start gap-2 pointer-events-none sm:gap-3">
        <div className="flex w-9 shrink-0 flex-col items-center gap-1 sm:w-auto sm:flex-row sm:gap-3">
          {isTopRank ? (
            <Badge className="bg-accent text-accent-foreground">
              <Crown className="size-3" />#{rank}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground sm:text-sm">#{rank}</span>
          )}
          <Avatar className="size-6 sm:size-8">
            {listing.logo_url && <AvatarImage src={listing.logo_url} alt="" />}
            <AvatarFallback>{(listing.title ?? bareUrl).charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate font-medium text-foreground">
              {listing.title ?? listing.display_url}
            </p>
            <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
              {listing.amount.toLocaleString("vi-VN")}đ
            </span>
          </div>
          {listing.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {listing.description}
            </p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground sm:text-xs">
            <Link
              href={`/category/${category.slug}`}
              className="pointer-events-auto inline-flex items-center gap-1 font-medium text-foreground hover:underline"
            >
              <CategoryIcon className="size-3" aria-hidden="true" />
              {category.name}
            </Link>
            <span>·</span>
            <span>{timeAgoVi(listing.updated_at)}</span>
            <span>·</span>
            <span>{bareUrl}</span>
            <span>·</span>
            <span>{clickCount.toLocaleString("vi-VN")} clicks</span>
            <span>·</span>
            <Link
              href={`/listing/${listing.id}`}
              className="pointer-events-auto hover:text-foreground hover:underline"
            >
              xem chi tiết
            </Link>
          </p>
        </div>
      </div>

      <Link
        href={`/submit?amount=${claimAmount}`}
        className="pointer-events-none absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold whitespace-nowrap text-accent-foreground opacity-0 shadow-sm transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
      >
        Giành hạng này với {claimAmount.toLocaleString("vi-VN")}đ
      </Link>
    </li>
  );
}
