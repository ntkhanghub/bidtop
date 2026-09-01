"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatVnDate, formatVnDateTime } from "@/lib/format-vn-datetime";
import type { ListingStatus } from "@/lib/supabase/database.types";
import { STATUS_BADGE } from "../listing-status";

type Listing = {
  id: string;
  title: string | null;
  logo_url: string | null;
  display_url: string;
  identity_key: string;
  category_id: string;
  submitter_email: string | null;
  amount: number;
  status: ListingStatus;
  rejection_reason: string | null;
  unpublished_at: string | null;
  created_at: string;
  updated_at: string;
  clickCount: number;
};
type Category = { id: string; slug: string; name_vi: string };

export function ListingRow({ listing, categories }: { listing: Listing; categories: Category[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function post(path: string) {
    setSubmitting(true);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không thực hiện được.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Không thực hiện được, thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnpublish() {
    await post(`/api/admin/listings/${listing.id}/unpublish`);
    toast.success("Đã gỡ listing");
  }

  async function handleRepublish() {
    await post(`/api/admin/listings/${listing.id}/republish`);
    toast.success("Đã đăng lại listing");
  }

  const statusBadge = STATUS_BADGE[listing.status];
  const categoryName = categories.find((c) => c.id === listing.category_id)?.name_vi ?? "—";

  return (
    <tr className="border-b border-border/50 align-top">
      <td className="py-2.5 pr-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {listing.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.logo_url}
              alt=""
              className="mt-0.5 size-8 shrink-0 rounded-md border border-border object-contain"
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
          ) : (
            <div className="mt-0.5 size-8 shrink-0 rounded-md border border-border bg-muted" />
          )}
          <div className="min-w-0">
            <p className="max-w-64 truncate font-medium text-foreground">
              {listing.title ?? listing.display_url}
            </p>
            <a
              href={listing.display_url}
              target="_blank"
              rel="noreferrer"
              className="block max-w-64 truncate text-sm text-muted-foreground hover:underline"
            >
              {listing.display_url}
            </a>
            <p className="max-w-64 truncate text-xs text-muted-foreground">
              {listing.submitter_email ?? "(không có email)"} · {categoryName}
            </p>
            {listing.status === "rejected" && listing.rejection_reason && (
              <p className="mt-1 max-w-64 text-xs text-destructive">
                Lý do từ chối: {listing.rejection_reason}
              </p>
            )}
            {listing.status === "unpublished" && listing.unpublished_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                Đã gỡ lúc {formatVnDateTime(listing.unpublished_at)}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="py-2.5 pr-3 font-mono whitespace-nowrap tabular-nums text-foreground">
        {listing.amount.toLocaleString("vi-VN")}đ
      </td>
      <td className="py-2.5 pr-3 tabular-nums text-foreground">{listing.clickCount.toLocaleString("vi-VN")}</td>
      <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">{formatVnDate(listing.created_at)}</td>
      <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">{formatVnDate(listing.updated_at)}</td>
      <td className="py-2.5 pr-3">
        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
      </td>
      <td className="py-2.5">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/listings/${listing.id}`}>Chi tiết</Link>
          </Button>

          {listing.status === "approved" && (
            <Button
              onClick={handleUnpublish}
              disabled={submitting}
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Gỡ
            </Button>
          )}
          {listing.status === "unpublished" && (
            <Button onClick={handleRepublish} disabled={submitting} size="sm">
              Đăng lại
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
