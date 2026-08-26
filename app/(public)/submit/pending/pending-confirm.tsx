"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Checkout = { checkoutUrl: string; fields: Record<string, string | number> };

// SePay's checkout is a browser FORM POST (initCheckoutUrl() is a POST
// target, not a redirect-navigable URL like ZaloPay's orderUrl) — this
// component fetches the signed fields, renders a hidden auto-submitting
// <form>, and provides a manual fallback button in case JS auto-submit is
// blocked.
export function PendingConfirm() {
  const searchParams = useSearchParams();
  const bidId = searchParams.get("bid");
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fetched = useRef(false);
  const submitted = useRef(false);

  useEffect(() => {
    if (fetched.current || !bidId) return;
    fetched.current = true;

    fetch("/api/payments/sepay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId }),
    })
      .then((res) => res.json())
      .then((data: { checkoutUrl?: string; fields?: Record<string, string | number>; error?: string }) => {
        if (data.checkoutUrl && data.fields) {
          setCheckout({ checkoutUrl: data.checkoutUrl, fields: data.fields });
        } else {
          setError(data.error ?? "Không tạo được đơn hàng SePay.");
        }
      })
      .catch(() => setError("Không kết nối được SePay, thử lại."));
  }, [bidId]);

  useEffect(() => {
    if (checkout && !submitted.current && formRef.current) {
      submitted.current = true;
      formRef.current.submit();
    }
  }, [checkout]);

  if (!bidId) {
    return (
      <Alert variant="destructive" className="mt-2">
        <CircleAlert />
        <AlertDescription>Thiếu thông tin thanh toán.</AlertDescription>
      </Alert>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive" className="mt-2">
        <CircleAlert />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (checkout) {
    return (
      <>
        <p className="mt-2 text-muted-foreground">Đang chuyển đến trang thanh toán SePay...</p>
        <form ref={formRef} method="POST" action={checkout.checkoutUrl} className="hidden">
          {Object.entries(checkout.fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={String(value)} />
          ))}
        </form>
        <Button
          type="button"
          variant="link"
          className="mt-2 px-0"
          onClick={() => formRef.current?.submit()}
        >
          Nếu không tự động chuyển, bấm vào đây
        </Button>
      </>
    );
  }
  return <p className="mt-2 text-muted-foreground">Đang chuẩn bị thanh toán...</p>;
}
