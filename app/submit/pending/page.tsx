import { Suspense } from "react";
import { PendingConfirm } from "./pending-confirm";

// TEMPORARY — auto-fires the mock payment confirmation (see
// app/api/payments/mock-confirm/route.ts) instead of waiting on a real gateway
// redirect + webhook. Sprint 3 replaces this with ZaloPay's hosted checkout;
// this page's role then reverts to display-only, per S3-T3's design.
export default function SubmitPendingPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">Thanh toán (giả lập)</h1>
      <Suspense fallback={<p className="mt-2 text-neutral-500">Đang xác nhận thanh toán...</p>}>
        <PendingConfirm />
      </Suspense>
    </main>
  );
}
