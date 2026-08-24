"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Listing = {
  id: string;
  display_url: string;
  category_id: string;
  submitter_email: string;
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
          onClick={handleApprove}
          disabled={submitting}
          className="rounded bg-neutral-900 px-3 py-1 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Duyệt
        </button>
        <button
          onClick={() => setShowReject((v) => !v)}
          disabled={submitting}
          className="rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Từ chối
        </button>
      </div>
      {showReject && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do từ chối"
            className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
          />
          <button
            onClick={handleReject}
            disabled={submitting}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            Xác nhận từ chối
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </li>
  );
}
