"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

type Category = { slug: string; name_vi: string };

// TEST-ONLY: keep in sync with app/api/listings/submit/route.ts's
// TEST_BYPASS_EMAIL — skips the client-side minimum-amount check for the
// same reason (cheap real-payment testing). The server enforces this too;
// this only avoids blocking the request before it ever reaches the server.
const TEST_BYPASS_EMAIL = "ntkhang@gmail.com";

type LookupResult = {
  identityKey: string;
  isNew: boolean;
  currentAmount: number;
  minimumRequired: number;
};

export function SubmitForm({
  categories,
  initialAmount,
}: {
  categories: Category[];
  initialAmount?: number;
}) {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : "");
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "other");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleIdentityBlur() {
    if (!identity.trim()) return;
    setLookupError(null);
    try {
      const res = await fetch("/api/listings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLookup(null);
        setLookupError(data.error ?? "Không đọc được URL/@handle.");
        return;
      }
      setLookup(data);
    } catch {
      setLookup(null);
      setLookupError("Không kiểm tra được domain, thử lại.");
      return;
    }

    if (!categoryTouched) {
      fetch("/api/listings/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity }),
      })
        .then((res) => res.json())
        .then((data: { slug?: string }) => {
          if (data.slug && !categoryTouched) setCategorySlug(data.slug);
        })
        .catch(() => {});
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const amountNumber = Number(amount);
    const isTestBypass = email.trim().toLowerCase() === TEST_BYPASS_EMAIL;
    if (!isTestBypass && lookup && amountNumber < lookup.minimumRequired) {
      setAmountError(`Số tiền tối thiểu là ${lookup.minimumRequired.toLocaleString("vi-VN")}đ.`);
      return;
    }
    setAmountError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/listings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, amount: amountNumber, categorySlug, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Không gửi được listing.");
        setSubmitting(false);
        return;
      }
      router.push(`/submit/pending?listing=${data.listingId}&bid=${data.bidId}`);
    } catch {
      setSubmitError("Không gửi được listing, thử lại.");
      setSubmitting(false);
    }
  }

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
        <Label htmlFor="email">Email</Label>
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
