"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm({
  startingPrice,
  minIncrement,
  vatPercent,
  showClickCount,
}: {
  startingPrice: number;
  minIncrement: number;
  vatPercent: number;
  showClickCount: boolean;
}) {
  const [values, setValues] = useState({
    starting_price: String(startingPrice),
    min_increment: String(minIncrement),
    vat_percent: String(vatPercent),
  });
  const [showClicks, setShowClicks] = useState(showClickCount);
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
        show_click_count: showClicks,
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
        <Label htmlFor="starting_price">Giá khởi điểm (VNĐ)</Label>
        <Input
          id="starting_price"
          type="number"
          value={values.starting_price}
          onChange={(e) => setValues((v) => ({ ...v, starting_price: e.target.value }))}
          className="mt-1 font-mono"
        />
      </div>
      <div>
        <Label htmlFor="min_increment">Bước tăng tối thiểu (VNĐ)</Label>
        <Input
          id="min_increment"
          type="number"
          value={values.min_increment}
          onChange={(e) => setValues((v) => ({ ...v, min_increment: e.target.value }))}
          className="mt-1 font-mono"
        />
      </div>
      <div>
        <Label htmlFor="vat_percent">VAT (%)</Label>
        <Input
          id="vat_percent"
          type="number"
          value={values.vat_percent}
          onChange={(e) => setValues((v) => ({ ...v, vat_percent: e.target.value }))}
          className="mt-1 font-mono"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={showClicks}
          onCheckedChange={(v) => setShowClicks(v === true)}
        />
        Hiện số click mỗi listing trên trang chủ/danh mục
      </label>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Đang lưu..." : "Lưu"}
      </Button>
    </form>
  );
}
