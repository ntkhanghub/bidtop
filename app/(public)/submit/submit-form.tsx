"use client";

import { CircleAlert, Minus, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useSubmitForm } from "./use-submit-form";

type Category = { slug: string; name_vi: string };

export function SubmitForm({
  categories,
  initialAmount,
  initialUrl,
  startingPrice,
  minIncrement,
}: {
  categories: Category[];
  initialAmount?: number;
  initialUrl?: string;
  startingPrice: number;
  minIncrement: number;
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
    email,
    setEmail,
    amountError,
    submitError,
    submitting,
    handleIdentityBlur,
    handleSubmit,
  } = useSubmitForm({ categories, initialAmount, initialUrl, startingPrice });

  function step(delta: number) {
    const next = Math.max(0, (Number(amount) || 0) + delta);
    setAmount(String(next));
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div>
        <Label htmlFor="identity">
          URL sản phẩm hoặc @handle <span className="text-destructive">*</span>
        </Label>
        <Input
          id="identity"
          type="text"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          onBlur={handleIdentityBlur}
          placeholder="URL công ty/sản phẩm hoặc profile FB/X/Linkedin... của bạn"
          className="mt-1"
        />
        {lookupError && <p className="mt-1 text-sm text-destructive">{lookupError}</p>}
        {lookup && (
          <p className="mt-1 text-sm text-muted-foreground">
            {lookup.isNew ? (
              `Listing mới — tối thiểu ${lookup.minimumRequired.toLocaleString("vi-VN")}đ.`
            ) : (
              <>
                Đã có listing (<b>{lookup.currentAmount.toLocaleString("vi-VN")}đ</b>) — nâng bid
                tối thiểu <b className="text-destructive">{lookup.minimumRequired.toLocaleString("vi-VN")}đ</b>.
              </>
            )}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="amount">
          Số tiền (VNĐ) <span className="text-destructive">*</span>
        </Label>
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            aria-label="Giảm số tiền"
            onClick={() => step(-minIncrement)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
          >
            <Minus className="size-4" />
          </button>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-mono"
          />
          <button
            type="button"
            aria-label="Tăng số tiền"
            onClick={() => step(minIncrement)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
          >
            <Plus className="size-4" />
          </button>
        </div>
        {amountError && <p className="mt-1 text-sm text-destructive">{amountError}</p>}
      </div>

      <div>
        <Label htmlFor="category">
          Danh mục <span className="text-destructive">*</span>
        </Label>
        <Select
          value={categorySlug}
          onValueChange={(value) => {
            setCategorySlug(value);
            setCategoryTouched(true);
          }}
        >
          <SelectTrigger id="category" className="mt-1 w-full">
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
      </div>

      <div>
        <Label htmlFor="email">Email (tuỳ chọn)</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1"
        />
      </div>

      {submitError && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Đang gửi..." : "Tiếp tục thanh toán"}
      </Button>
    </form>
  );
}
