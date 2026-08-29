import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { formatVnDate, formatVnDateTime } from "@/lib/format-vn-datetime";
import { supabase } from "@/lib/supabase/server";
import { BID_STATUS_BADGE } from "../../bid-status";
import { EditForm } from "./edit-form";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("admin");
  const { id } = await params;

  const [{ data: listing }, { data: categories }, { data: bids }, { data: clicks }] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, title, logo_url, description, display_url, category_id, status, created_at, rejection_reason, unpublished_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, slug, name_vi").order("sort_order"),
    supabase
      .from("bids")
      .select("id, delta_amount, vat_amount, total_charged, status, created_at, confirmed_at")
      .eq("listing_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("listing_clicks").select("created_at").eq("listing_id", id).order("created_at", { ascending: false }),
  ]);
  if (!listing) notFound();

  const clicksByDay = new Map<string, number>();
  for (const click of clicks ?? []) {
    const day = formatVnDate(click.created_at);
    clicksByDay.set(day, (clicksByDay.get(day) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Chỉnh sửa listing</h1>
      <EditForm listing={listing} categories={categories ?? []} />

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Lượt click ({(clicks ?? []).length})</h2>
        {clicksByDay.size === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Chưa có lượt click nào.</p>
        ) : (
          <div className="mt-2 max-w-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1.5 font-medium">Ngày</th>
                  <th className="py-1.5 font-medium">Số click</th>
                </tr>
              </thead>
              <tbody>
                {[...clicksByDay.entries()].map(([day, count]) => (
                  <tr key={day} className="border-b border-border/50">
                    <td className="py-1.5">{day}</td>
                    <td className="py-1.5 tabular-nums">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Lịch sử bid</h2>
        {!bids || bids.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Chưa có bid nào.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1.5 font-medium">Ngày tạo</th>
                  <th className="py-1.5 font-medium">+Bid</th>
                  <th className="py-1.5 font-medium">VAT</th>
                  <th className="py-1.5 font-medium">Tổng thu</th>
                  <th className="py-1.5 font-medium">Trạng thái</th>
                  <th className="py-1.5 font-medium">Xác nhận lúc</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid) => {
                  const badge = BID_STATUS_BADGE[bid.status];
                  return (
                    <tr key={bid.id} className="border-b border-border/50">
                      <td className="py-1.5 whitespace-nowrap">
                        {formatVnDateTime(bid.created_at)}
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
                      <td className="py-1.5 whitespace-nowrap">
                        {bid.confirmed_at ? formatVnDateTime(bid.confirmed_at) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
