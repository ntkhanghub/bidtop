"use client";

import { useState } from "react";
import { toast } from "sonner";

export function SettingsForm({
  startingPrice,
  minIncrement,
  vatPercent,
}: {
  startingPrice: number;
  minIncrement: number;
  vatPercent: number;
}) {
  const [values, setValues] = useState({
    starting_price: String(startingPrice),
    min_increment: String(minIncrement),
    vat_percent: String(vatPercent),
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        starting_price: Number(values.starting_price),
        min_increment: Number(values.min_increment),
        vat_percent: Number(values.vat_percent),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(data.error ?? "Không lưu được cài đặt.");
      return;
    }
    toast.success("Đã lưu cài đặt");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex max-w-sm flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Giá khởi điểm (VNĐ)</label>
        <input
          type="number"
          value={values.starting_price}
          onChange={(e) => setValues((v) => ({ ...v, starting_price: e.target.value }))}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Bước tăng tối thiểu (VNĐ)</label>
        <input
          type="number"
          value={values.min_increment}
          onChange={(e) => setValues((v) => ({ ...v, min_increment: e.target.value }))}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">VAT (%)</label>
        <input
          type="number"
          value={values.vat_percent}
          onChange={(e) => setValues((v) => ({ ...v, vat_percent: e.target.value }))}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {submitting ? "Đang lưu..." : "Lưu"}
      </button>
    </form>
  );
}
