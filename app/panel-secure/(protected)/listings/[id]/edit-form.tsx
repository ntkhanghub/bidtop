"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatVnDateTime } from "@/lib/format-vn-datetime";
import type { ListingStatus } from "@/lib/supabase/database.types";
import { STATUS_BADGE } from "../../listing-status";

type Listing = {
  id: string;
  title: string | null;
  logo_url: string | null;
  description: string | null;
  display_url: string;
  category_id: string;
  status: ListingStatus;
  created_at: string;
  rejection_reason: string | null;
  unpublished_at: string | null;
};
type Category = { id: string; slug: string; name_vi: string };

export function EditForm({ listing, categories }: { listing: Listing; categories: Category[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(listing.title ?? "");
  const [logoUrl, setLogoUrl] = useState(listing.logo_url ?? "");
  const [description, setDescription] = useState(listing.description ?? "");
  const [displayUrl, setDisplayUrl] = useState(listing.display_url);
  const [categoryId, setCategoryId] = useState(listing.category_id);
  const [submitting, setSubmitting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/admin/listings/${listing.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, logoUrl, description, displayUrl, categoryId }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(data.error ?? "Không lưu được listing.");
      return;
    }
    toast.success("Đã lưu listing");
    router.push("/panel-secure/listings");
  }

  // Mirrors the existing guarded status-transition endpoints (approve/reject/
  // unpublish/republish) — each one enforces its own required source status
  // and sets its own bookkeeping fields (reviewed_by, unpublished_at, etc.),
  // so this stays a thin wrapper rather than a free-form status field.
  async function postStatus(path: string, body?: Record<string, unknown>) {
    setStatusError(null);
    setStatusBusy(true);
    const res = await fetch(path, {
      method: "POST",
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    setStatusBusy(false);
    if (!res.ok) {
      setStatusError(data.error ?? "Không thực hiện được.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleApprove() {
    if (await postStatus(`/api/admin/listings/${listing.id}/approve`, { categoryId })) {
      toast.success("Đã duyệt listing");
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setStatusError("Cần nhập lý do từ chối.");
      return;
    }
    if (await postStatus(`/api/admin/listings/${listing.id}/reject`, { reason: rejectReason })) {
      toast.success("Đã từ chối listing");
      setShowReject(false);
      setRejectReason("");
    }
  }

  async function handleUnpublish() {
    if (await postStatus(`/api/admin/listings/${listing.id}/unpublish`)) {
      toast.success("Đã gỡ listing");
    }
  }

  async function handleRepublish() {
    if (await postStatus(`/api/admin/listings/${listing.id}/republish`)) {
      toast.success("Đã đăng lại listing");
    }
  }

  const statusBadge = STATUS_BADGE[listing.status];

  return (
    <div className="mt-6 flex max-w-lg flex-col gap-6">
      <div className="rounded-lg border border-border p-4">
        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Submit lần đầu: {formatVnDateTime(listing.created_at)}
        </p>

        {listing.status === "rejected" && listing.rejection_reason && (
          <p className="mt-2 text-sm text-destructive">Lý do từ chối: {listing.rejection_reason}</p>
        )}
        {listing.status === "unpublished" && listing.unpublished_at && (
          <p className="mt-2 text-sm text-muted-foreground">
            Đã gỡ lúc {formatVnDateTime(listing.unpublished_at)}
          </p>
        )}

        {listing.status === "paid_pending_review" && (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Button onClick={handleApprove} disabled={statusBusy} size="sm">
                Duyệt
              </Button>
              <Button
                onClick={() => setShowReject((v) => !v)}
                disabled={statusBusy}
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Từ chối
              </Button>
            </div>
            {showReject && (
              <div className="flex items-center gap-2">
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Lý do từ chối"
                  className="flex-1"
                />
                <Button onClick={handleReject} disabled={statusBusy} variant="destructive" size="sm">
                  Xác nhận từ chối
                </Button>
              </div>
            )}
          </div>
        )}
        {listing.status === "approved" && (
          <div className="mt-3">
            <Button
              onClick={handleUnpublish}
              disabled={statusBusy}
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Gỡ
            </Button>
          </div>
        )}
        {listing.status === "unpublished" && (
          <div className="mt-3">
            <Button onClick={handleRepublish} disabled={statusBusy} size="sm">
              Đăng lại
            </Button>
          </div>
        )}
        {statusError && <p className="mt-2 text-sm text-destructive">{statusError}</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="title">Tiêu đề</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </div>

        <div>
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input
            id="logoUrl"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="mt-1"
          />
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="mt-2 size-10 rounded-md border border-border object-contain"
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
          )}
        </div>

        <div>
          <Label htmlFor="description">Mô tả</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
            rows={4}
          />
        </div>

        <div>
          <Label htmlFor="displayUrl">Đường dẫn (URL)</Label>
          <Input
            id="displayUrl"
            value={displayUrl}
            onChange={(e) => setDisplayUrl(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="category">Danh mục</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category" className="mt-1 w-full">
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
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/panel-secure/listings">Huỷ</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
