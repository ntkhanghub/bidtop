"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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

  return (
    <li className="rounded border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <a
          href={listing.display_url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-neutral-900 hover:underline"
        >
          {listing.display_url}
        </a>
        <span className="text-neutral-500">{listing.amount.toLocaleString("vi-VN")}đ</span>
      </div>
      <p className="mt-1 text-sm text-neutral-500">{listing.submitter_email}</p>

      {listing.status === "rejected" && listing.rejection_reason && (
        <p className="mt-2 text-sm text-red-600">Lý do từ chối: {listing.rejection_reason}</p>
      )}
      {listing.status === "unpublished" && listing.unpublished_at && (
        <p className="mt-2 text-sm text-neutral-500">
          Đã gỡ lúc {new Date(listing.unpublished_at).toLocaleString("vi-VN")}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_vi}
            </option>
          ))}
        </select>
        <button
          onClick={handleSaveCategory}
          disabled={submitting}
          className="rounded border border-neutral-300 px-3 py-1 text-sm text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
        >
          Lưu category
        </button>

        {listing.status === "approved" && (
          <button
            onClick={handleUnpublish}
            disabled={submitting}
            className="rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Gỡ
          </button>
        )}
        {listing.status === "unpublished" && (
          <button
            onClick={handleRepublish}
            disabled={submitting}
            className="rounded bg-neutral-900 px-3 py-1 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Đăng lại
          </button>
        )}
      </div>
    </li>
  );
}
