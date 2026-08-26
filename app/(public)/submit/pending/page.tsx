import { Suspense } from "react";
import { PendingConfirm } from "./pending-confirm";

// Kicks off a real ZaloPay checkout session for the just-created bid, then
// sends the browser to ZaloPay's hosted (QR/ZaloPay-wallet) payment page. This
// page itself writes nothing to the DB — see app/api/payments/zalopay/
// create-order/route.ts. Payment confirmation only ever comes from the IPN
// webhook (app/api/webhooks/zalopay); the browser-return redirect after
// payment lands on /submit/return, which is display-only for the same reason.
export default function SubmitPendingPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">Thanh toán qua ZaloPay</h1>
      <Suspense fallback={<p className="mt-2 text-muted-foreground">Đang chuẩn bị thanh toán...</p>}>
        <PendingConfirm />
      </Suspense>
    </main>
  );
}
