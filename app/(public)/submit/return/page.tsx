// SePay's browser-return redirect target (adapted from S3-T3's ZaloPay
// design). DISPLAY-ONLY — this route must never write to listings/bids. Only
// the IPN webhook (app/api/webhooks/sepay/route.ts) is authorized to confirm
// a payment; see CLAUDE.md's rank-integrity rule.
//
// `outcome` is a discriminator WE chose ourselves when building the
// success_url/error_url/cancel_url passed to SePay's checkout — never
// SePay-supplied data. This intentionally avoids needing to parse or trust
// any query params SePay itself might append (undocumented shape), since the
// page makes no DB-backed promises either way.
export default async function SubmitReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { outcome } = await searchParams;

  const copy = {
    success: {
      title: "Đã ghi nhận thanh toán",
      body: "SePay báo thanh toán thành công. Hệ thống đang xác nhận — vị trí của bạn sẽ cập nhật trong giây lát.",
    },
    error: {
      title: "Thanh toán không thành công",
      body: "Giao dịch không hoàn tất. Bạn có thể quay lại và thử thanh toán lại.",
    },
    cancel: {
      title: "Đã hủy thanh toán",
      body: "Bạn đã hủy giao dịch. Không có khoản nào bị trừ.",
    },
  }[outcome ?? ""] ?? {
    title: "Đang xử lý thanh toán",
    body: "Kết quả thanh toán đang được hệ thống xác nhận. Vui lòng kiểm tra lại sau ít phút.",
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
      <p className="mt-2 text-muted-foreground">{copy.body}</p>
    </main>
  );
}
