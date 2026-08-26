export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">Giới thiệu</h1>
      <div className="mt-4 flex flex-col gap-4 text-foreground/80">
        <p>
          BidTop.vn là bảng xếp hạng công khai cho doanh nghiệp Việt Nam (SaaS, agency, bất động
          sản, và nhiều ngành khác) — nơi thứ hạng hoàn toàn minh bạch: ai trả nhiều hơn thì đứng cao
          hơn, không qua bình chọn hay đánh giá chất lượng.
        </p>
        {/* TODO: nội dung thật về công ty (người sáng lập, lịch sử, liên hệ) — chờ cung cấp */}
      </div>
    </main>
  );
}
