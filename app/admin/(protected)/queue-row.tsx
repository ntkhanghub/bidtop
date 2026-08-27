"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Listing = {
  id: string;
  display_url: string;
  category_id: string;
  submitter_email: string | null;
  amount: number;
};
type Category = { id: string; slug: string; name_vi: string };

export function QueueRow({ listing, categories }: { listing: Listing; categories: Category[] }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(listing.category_id);
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleApprove() {
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/admin/listings/${listing.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Không duyệt được.");
      return;
    }
    router.refresh();
  }

  async function handleReject() {
    if (!reason.trim()) {
      setError("Cần nhập lý do từ chối.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/admin/listings/${listing.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Không từ chối được.");
      return;
    }
    router.refresh();
  }

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
          <Badge className="bg-accent text-accent-foreground">Chờ duyệt</Badge>
          <span className="font-mono text-sm tabular-nums text-muted-foreground">
            {listing.amount.toLocaleString("vi-VN")}đ
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {listing.submitter_email ?? "(không có email)"}
      </p>
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
        <Button onClick={handleApprove} disabled={submitting} size="sm">
          Duyệt
        </Button>
        <Button
          onClick={() => setShowReject((v) => !v)}
          disabled={submitting}
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Từ chối
        </Button>
      </div>
      {showReject && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do từ chối"
            className="flex-1"
          />
          <Button onClick={handleReject} disabled={submitting} variant="destructive" size="sm">
            Xác nhận từ chối
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </Card>
  );
}
