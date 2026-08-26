import Link from "next/link";
import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const isTopRank = rank === 1;

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 py-3",
        isTopRank && "rounded-xl border border-accent bg-accent/10 px-3"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {isTopRank ? (
          <Badge className="bg-accent text-accent-foreground">
            <Crown className="size-3" />#{rank}
          </Badge>
        ) : (
          <span className="w-8 text-right text-sm text-muted-foreground">#{rank}</span>
        )}
        <a href={`/out/${listing.id}`} className="truncate text-foreground hover:underline">
          {listing.display_url}
        </a>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {listing.amount.toLocaleString("vi-VN")}đ
        </span>
        <Button asChild variant="outline" size="sm">
          <Link href={`/submit?amount=${claimAmount}`}>Giành hạng này</Link>
        </Button>
      </div>
    </li>
  );
}
