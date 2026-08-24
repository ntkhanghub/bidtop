"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Result = { amount: number; status: string } | { error: string };

export function PendingConfirm() {
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listing");
  const bidId = searchParams.get("bid");
  const [result, setResult] = useState<Result | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !bidId) return;
    fired.current = true;

    fetch("/api/payments/mock-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId }),
    })
      .then((res) => res.json())
      .then(setResult)
      .catch(() => setResult({ error: "Không xác nhận được thanh toán, thử lại." }));
  }, [bidId]);

  if (!bidId) {
    return <p className="mt-2 text-red-600">Thiếu thông tin thanh toán.</p>;
  }
  if (!result) {
    return <p className="mt-2 text-neutral-500">Đang xác nhận thanh toán...</p>;
  }
  if ("error" in result) {
    return <p className="mt-2 text-red-600">{result.error}</p>;
  }
  return (
    <p className="mt-2 text-neutral-500">
      Thanh toán thành công — vị trí hiện tại: {result.amount.toLocaleString("vi-VN")}đ (listing
      ID: {listingId ?? "?"}). Listing mới cần admin duyệt trước khi lên bảng xếp hạng công khai;
      nâng bid trên listing đã duyệt thì lên ngay.
    </p>
  );
}
