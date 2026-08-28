import Link from "next/link";
import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgoVi } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

type Listing = {
  id: string;
  display_url: string;
  amount: number;
  title: string | null;
  logo_url: string | null;
  description: string | null;
  updated_at: string;
};

export function ListingRow({
  listing,
  rank,
  minIncrement,
  categoryName,
  clickCount,
}: {
  listing: Listing;
  rank: number;
  minIncrement: number;
  categoryName: string;
  clickCount: number;
}) {
  const claimAmount = listing.amount + minIncrement;
  const isTopRank = rank === 1;
  const bareUrl = listing.display_url.replace(/^https?:\/\//, "").replace(/\/$/, "");

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
        "group flex items-start justify-between gap-3 py-4",
        topBorderStyles[rank] && cn("rounded-xl border px-3", topBorderStyles[rank])
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {isTopRank ? (
          <Badge className="mt-0.5 bg-accent text-accent-foreground">
            <Crown className="size-3" />#{rank}
          </Badge>
        ) : (
          <span className="mt-1 w-8 text-right text-sm text-muted-foreground">#{rank}</span>
        )}
        <Avatar className="mt-0.5">
          {listing.logo_url && <AvatarImage src={listing.logo_url} alt="" />}
          <AvatarFallback>{(listing.title ?? bareUrl).charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{listing.title ?? listing.display_url}</p>
          {listing.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{listing.description}</p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>{categoryName}</span>
            <span>·</span>
            <span>{timeAgoVi(listing.updated_at)}</span>
            <span>·</span>
            <a href={`/out/${listing.id}`} className="hover:text-foreground hover:underline">
              {bareUrl}
            </a>
            <span>·</span>
            <span>{clickCount.toLocaleString("vi-VN")} clicks</span>
            <span>·</span>
            <Link href={`/listing/${listing.id}`} className="hover:text-foreground hover:underline">
              xem chi tiết
            </Link>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {listing.amount.toLocaleString("vi-VN")}đ
        </span>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100"
        >
          <Link href={`/submit?amount=${claimAmount}`}>
            Giành hạng này với {claimAmount.toLocaleString("vi-VN")}đ
          </Link>
        </Button>
      </div>
    </li>
  );
}
