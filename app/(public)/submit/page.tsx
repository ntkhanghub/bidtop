import { supabase } from "@/lib/supabase/server";
import { SubmitForm } from "./submit-form";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string }>;
}) {
  const { amount } = await searchParams;
  const [{ data: categories }, { data: settingsRows }] = await Promise.all([
    supabase.from("categories").select("slug, name_vi").order("sort_order"),
    supabase.from("settings").select("key, value").in("key", ["min_increment", "starting_price"]),
  ]);
  const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, Number(s.value)]));
  const minIncrement = settings.min_increment ?? 50000;
  const startingPrice = settings.starting_price ?? 100000;

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">Đăng listing</h1>
      <p className="mt-1 text-muted-foreground">
        <b>Rank (thứ hạng)</b> là số tiền đã trả — không gì khác.<br></br> 
        Đã có listing rồi? Nhập lại URL công ty/profile để nâng hạng
        thay vì tạo mới — ai cũng nâng hạng được, không cần đúng email ban đầu.
      </p>
      <SubmitForm
        categories={categories ?? []}
        initialAmount={amount ? Number(amount) : undefined}
        startingPrice={startingPrice}
        minIncrement={minIncrement}
      />
    </main>
  );
}
