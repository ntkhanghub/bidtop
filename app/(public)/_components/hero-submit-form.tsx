"use client";

import { CircleAlert, Minus, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubmitForm } from "../submit/use-submit-form";

type Category = { slug: string; name_vi: string };

export function HeroSubmitForm({
  categories,
  initialAmount,
  minIncrement,
  startingPrice,
}: {
  categories: Category[];
  initialAmount: number;
  minIncrement: number;
  startingPrice: number;
}) {
  const {
    identity,
    setIdentity,
    lookup,
    lookupError,
    amount,
    setAmount,
    categorySlug,
    setCategorySlug,
    setCategoryTouched,
    amountError,
    submitError,
    submitting,
    handleIdentityBlur,
    handleSubmit,
  } = useSubmitForm({ categories, initialAmount });

  function step(delta: number) {
    const next = Math.max(0, (Number(amount) || 0) + delta);
    setAmount(String(next));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-2xl border border-border bg-card px-5 py-5"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-lg font-semibold text-foreground">Giành hạng #1 với</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Giảm số tiền"
            onClick={() => step(-minIncrement)}
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
          >
            <Minus className="size-4" />
          </button>
          <span className="font-mono text-2xl font-semibold tabular-nums text-accent">
            {(Number(amount) || 0).toLocaleString("vi-VN")}đ
          </span>
          <button
            type="button"
            aria-label="Tăng số tiền"
            onClick={() => step(minIncrement)}
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {lookup
          ? lookup.isNew
            ? `Listing mới — tối thiểu ${lookup.minimumRequired.toLocaleString("vi-VN")}đ.`
            : `Đã có listing (${lookup.currentAmount.toLocaleString("vi-VN")}đ) — nâng bid tối thiểu ${lookup.minimumRequired.toLocaleString("vi-VN")}đ.`
          : `Vị trí mới bắt đầu từ ${startingPrice.toLocaleString("vi-VN")}đ. Trả giá thấp hơn giá #1 vẫn giúp bạn vào bảng ở vị trí phù hợp.`}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          onBlur={handleIdentityBlur}
          placeholder="URL sản phẩm hoặc @handle của bạn"
          className="sm:flex-[2]"
        />
        <Select
          value={categorySlug}
          onValueChange={(value) => {
            setCategorySlug(value);
            setCategoryTouched(true);
          }}
        >
          <SelectTrigger className="sm:flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name_vi}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={submitting} className="sm:flex-none">
          {submitting ? "Đang gửi..." : "Tham gia xếp hạng"}
        </Button>
      </div>

      {lookupError && <p className="mt-2 text-sm text-destructive">{lookupError}</p>}
      {amountError && <p className="mt-2 text-sm text-destructive">{amountError}</p>}
      {submitError && (
        <Alert variant="destructive" className="mt-3">
          <CircleAlert />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
