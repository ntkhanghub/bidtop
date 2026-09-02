import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { formatVnDateTime } from "@/lib/format-vn-datetime";
import { supabase } from "@/lib/supabase/server";
import { BID_STATUS_BADGE } from "../bid-status";

const PAGE_SIZE = 20;

export default async function AdminBidsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminPage("admin");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: bids, count } = await supabase
    .from("bids")
    .select(
      "id, listing_id, delta_amount, vat_amount, total_charged, status, created_at, confirmed_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  const listingIds = [...new Set((bids ?? []).map((b) => b.listing_id))];
  const { data: listings } = listingIds.length
    ? await supabase.from("listings").select("id, title, display_url").in("id", listingIds)
    : { data: [] };
  const listingMap = new Map((listings ?? []).map((l) => [l.id, l]));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function pageHref(targetPage: number) {
    return targetPage > 1 ? `/panel-secure/bids?page=${targetPage}` : "/panel-secure/bids";
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Lịch sử bid</h1>

      {!bids || bids.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Chưa có bid nào.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1.5 font-medium">Ngày tạo</th>
                <th className="py-1.5 font-medium">Listing</th>
                <th className="py-1.5 font-medium">+Bid</th>
                <th className="py-1.5 font-medium">VAT</th>
                <th className="py-1.5 font-medium">Tổng thu</th>
                <th className="py-1.5 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((bid) => {
                const listing = listingMap.get(bid.listing_id);
                const badge = BID_STATUS_BADGE[bid.status];
                return (
                  <tr key={bid.id} className="border-b border-border/50">
                    <td className="py-1.5 whitespace-nowrap">
                      {formatVnDateTime(bid.created_at)}
                    </td>
                    <td className="max-w-48 truncate py-1.5">
                      {listing ? (
                        <Link href={`/panel-secure/listings/${listing.id}`} className="hover:underline">
                          {listing.title ?? listing.display_url}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-1.5 tabular-nums whitespace-nowrap">
                      {bid.delta_amount.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="py-1.5 tabular-nums whitespace-nowrap">
                      {bid.vat_amount.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="py-1.5 tabular-nums whitespace-nowrap">
                      {bid.total_charged.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="py-1.5">
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
