"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ListingStatus } from "@/lib/supabase/database.types";

type Listing = {
  id: string;
  display_url: string;
  identity_key: string;
  category_id: string;
  submitter_email: string;
  amount: number;
  status: ListingStatus;
  rejection_reason: string | null;
  unpublished_at: string | null;
};
type Category = { id: string; slug: string; name_vi: string };

const STATUS_BADGE: Record<ListingStatus, { label: string; className: string }> = {
  approved: { label: "Đã duyệt", className: "bg-live/15 text-live" },
  rejected: { label: "Đã từ chối", className: "bg-destructive/15 text-destructive" },
  unpublished: { label: "Đã gỡ", className: "bg-muted text-muted-foreground" },
  paid_pending_review: { label: "Chờ duyệt", className: "bg-accent/20 text-accent-foreground" },
  draft: { label: "Nháp", className: "bg-muted text-muted-foreground" },
  pending_payment: { label: "Chờ thanh toán", className: "bg-muted text-muted-foreground" },
};

export function ListingRow({ listing, categories }: { listing: Listing; categories: Category[] }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(listing.category_id);
  const [submitting, setSubmitting] = useState(false);

  async function post(path: string, body?: unknown) {
    setSubmitting(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
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

  async function handleSaveCategory() {
    await post(`/api/admin/listings/${listing.id}/category`, { categoryId });
    toast.success("Đã lưu category");
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

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <a
          href={listing.display_url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-foreground hover:underline"
        >
          {listing.display_url}
        </a>
        <div className="flex shrink-0 items-center gap-2">
          <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
          <span className="font-mono text-sm tabular-nums text-muted-foreground">
            {listing.amount.toLocaleString("vi-VN")}đ
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{listing.submitter_email}</p>

      {listing.status === "rejected" && listing.rejection_reason && (
        <p className="mt-2 text-sm text-destructive">Lý do từ chối: {listing.rejection_reason}</p>
      )}
      {listing.status === "unpublished" && listing.unpublished_at && (
        <p className="mt-2 text-sm text-muted-foreground">
          Đã gỡ lúc {new Date(listing.unpublished_at).toLocaleString("vi-VN")}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name_vi}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSaveCategory} disabled={submitting} variant="outline" size="sm">
          Lưu category
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
    </Card>
  );
}
