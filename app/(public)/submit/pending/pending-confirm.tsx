"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function PendingConfirm() {
  const searchParams = useSearchParams();
  const bidId = searchParams.get("bid");
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !bidId) return;
    fired.current = true;

    fetch("/api/payments/zalopay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId }),
    })
      .then((res) => res.json())
      .then((data: { orderUrl?: string; error?: string }) => {
        if (data.orderUrl) {
          window.location.href = data.orderUrl;
        } else {
          setError(data.error ?? "Không tạo được đơn hàng ZaloPay.");
        }
      })
      .catch(() => setError("Không kết nối được ZaloPay, thử lại."));
  }, [bidId]);

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
  return (
    <p className="mt-2 text-muted-foreground">Đang chuyển đến trang thanh toán ZaloPay...</p>
  );
}
