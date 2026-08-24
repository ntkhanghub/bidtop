// Placeholder redirect target for Sprint 2 — real 9Pay checkout session
// creation replaces this in Sprint 3 (S3-T2).
export default async function SubmitPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string }>;
}) {
  const { listing } = await searchParams;

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">Đang chờ thanh toán</h1>
      <p className="mt-2 text-neutral-500">
        Listing đã được tạo (ID: {listing ?? "?"}). Cổng thanh toán 9Pay sẽ được tích hợp ở
        Sprint 3 — hiện tại listing của bạn đang ở trạng thái chờ, chưa lên bảng xếp hạng.
      </p>
    </main>
  );
}
