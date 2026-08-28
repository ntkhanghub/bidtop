"use client";

import { CircleAlert } from "lucide-react";
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
}: {
  categories: Category[];
  initialAmount?: number;
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
  } = useSubmitForm({ categories, initialAmount });

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div>
        <Label htmlFor="identity">URL sản phẩm hoặc @handle</Label>
        <Input
          id="identity"
          type="text"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          onBlur={handleIdentityBlur}
          placeholder="stripe.com hoặc @yourhandle"
          className="mt-1"
        />
        {lookupError && <p className="mt-1 text-sm text-destructive">{lookupError}</p>}
        {lookup && (
          <p className="mt-1 text-sm text-muted-foreground">
            {lookup.isNew
              ? `Listing mới — tối thiểu ${lookup.minimumRequired.toLocaleString("vi-VN")}đ.`
              : `Đã có listing (${lookup.currentAmount.toLocaleString("vi-VN")}đ) — nâng bid tối thiểu ${lookup.minimumRequired.toLocaleString("vi-VN")}đ.`}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="amount">Số tiền (VNĐ)</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 font-mono"
        />
        {amountError && <p className="mt-1 text-sm text-destructive">{amountError}</p>}
      </div>

      <div>
        <Label htmlFor="category">Danh mục</Label>
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
