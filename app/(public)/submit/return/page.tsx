import { verifyReturnChecksum } from "@/lib/payment/zalopay";

// ZaloPay's browser-return redirect target (S3-T3). DISPLAY-ONLY — this route
// must never write to listings/bids. Only the IPN webhook
// (app/api/webhooks/zalopay/route.ts) is authorized to confirm a payment; see
// CLAUDE.md's rank-integrity rule. The checksum here is verified only to
// decide which cosmetic message to show, never to gate a DB write.
export default async function SubmitReturnPage({
  searchParams,
}: {
  searchParams: Promise<{
    appid?: string;
    apptransid?: string;
    pmcid?: string;
    bankcode?: string;
    amount?: string;
    discountamount?: string;
    status?: string;
    checksum?: string;
  }>;
}) {
  const params = await searchParams;

  const looksValid =
    !!params.checksum &&
    verifyReturnChecksum({
      appid: params.appid ?? "",
      apptransid: params.apptransid ?? "",
      pmcid: params.pmcid ?? "",
      bankcode: params.bankcode ?? "",
      amount: params.amount ?? "",
      discountamount: params.discountamount ?? "",
      status: params.status ?? "",
      checksum: params.checksum ?? "",
    });
  const looksSuccessful = looksValid && params.status === "1";

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">
        {looksSuccessful ? "Đã ghi nhận thanh toán" : "Đang xử lý thanh toán"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {looksSuccessful
          ? "ZaloPay báo thanh toán thành công. Hệ thống đang xác nhận — vị trí của bạn sẽ cập nhật trong giây lát."
          : "Kết quả thanh toán đang được hệ thống xác nhận. Vui lòng kiểm tra lại sau ít phút."}
      </p>
    </main>
  );
}
