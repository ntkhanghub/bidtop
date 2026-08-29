"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

export function useSubmitForm({
  categories,
  initialAmount,
  startingPrice = 0,
}: {
  categories: Category[];
  initialAmount?: number;
  startingPrice?: number;
}) {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(initialAmount ?? startingPrice));
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

    if (!identity.trim()) {
      setLookupError("Vui lòng nhập URL hoặc @handle.");
      return;
    }

    const amountNumber = Number(amount);
    if (!amount.trim() || Number.isNaN(amountNumber)) {
      setAmountError("Vui lòng nhập số tiền.");
      return;
    }

    const isTestBypass = email.trim().toLowerCase() === TEST_BYPASS_EMAIL;
    const minimumRequired = lookup ? lookup.minimumRequired : startingPrice;
    if (!isTestBypass && amountNumber < minimumRequired) {
      setAmountError(`Số tiền tối thiểu là ${minimumRequired.toLocaleString("vi-VN")}đ.`);
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

  return {
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
  };
}
