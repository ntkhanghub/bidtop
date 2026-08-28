import { SITE_NAME } from "@/lib/site";
import { supabase } from "@/lib/supabase/server";

export const revalidate = 30;

export default async function RulesPage() {
  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["starting_price", "min_increment", "vat_percent"]);
  const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, Number(s.value)]));

  return (
    <main className="mx-auto max-w-[900px] px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">Luật chơi</h1>
      <div className="mt-4 flex flex-col gap-4 text-foreground/80">
        <p>
          Thứ hạng trên {SITE_NAME} là số tiền đã trả — không có yếu tố nào khác. Ai trả nhiều hơn sẽ
          đứng cao hơn, bất kỳ lúc nào.
        </p>
        <p>
          Giá khởi điểm cho 1 listing mới là{" "}
          <span className="font-mono tabular-nums">
            {settings.starting_price?.toLocaleString("vi-VN")}đ
          </span>
          . Mỗi lần nâng hạng (listing mới hoặc đã có) phải tăng tối thiểu{" "}
          <span className="font-mono tabular-nums">
            {settings.min_increment?.toLocaleString("vi-VN")}đ
          </span>{" "}
          so với số tiền hiện tại.
        </p>
        <p>
          VAT {settings.vat_percent}% được tính riêng, cộng thêm vào số tiền thanh toán — không nằm
          trong số tiền dùng để xếp hạng.
        </p>
        <p>
          Listing mới cần admin duyệt trước khi lên bảng xếp hạng công khai, để đảm bảo không có
          nội dung vi phạm (link chat/mời nhóm, link rút gọn không resolve được, v.v.). Nâng hạng
          trên listing đã duyệt thì lên ngay, không cần duyệt lại.
        </p>
      </div>
    </main>
  );
}
