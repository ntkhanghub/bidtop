"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = { slug: string; name_vi: string };

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
    if (lookup && amountNumber < lookup.minimumRequired) {
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
      router.push(`/submit/pending?listing=${data.listingId}`);
    } catch {
      setSubmitError("Không gửi được listing, thử lại.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">
          URL sản phẩm hoặc @handle
        </label>
        <input
          type="text"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          onBlur={handleIdentityBlur}
          placeholder="stripe.com hoặc @yourhandle"
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        />
        {lookupError && <p className="mt-1 text-sm text-red-600">{lookupError}</p>}
        {lookup && (
          <p className="mt-1 text-sm text-neutral-500">
            {lookup.isNew
              ? `Listing mới — tối thiểu ${lookup.minimumRequired.toLocaleString("vi-VN")}đ.`
              : `Đã có listing (${lookup.currentAmount.toLocaleString("vi-VN")}đ) — nâng bid tối thiểu ${lookup.minimumRequired.toLocaleString("vi-VN")}đ.`}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Số tiền (VNĐ)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        />
        {amountError && <p className="mt-1 text-sm text-red-600">{amountError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Danh mục</label>
        <select
          value={categorySlug}
          onChange={(e) => {
            setCategorySlug(e.target.value);
            setCategoryTouched(true);
          }}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        >
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name_vi}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
        />
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {submitting ? "Đang gửi..." : "Tiếp tục thanh toán"}
      </button>
    </form>
  );
}
