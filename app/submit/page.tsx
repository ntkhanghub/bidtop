import { supabase } from "@/lib/supabase/server";
import { SubmitForm } from "./submit-form";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string }>;
}) {
  const { amount } = await searchParams;
  const { data: categories } = await supabase
    .from("categories")
    .select("slug, name_vi")
    .order("sort_order");

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">Đăng listing</h1>
      <p className="mt-1 text-neutral-500">Rank là số tiền đã trả — không gì khác.</p>
      <SubmitForm
        categories={categories ?? []}
        initialAmount={amount ? Number(amount) : undefined}
      />
    </main>
  );
}
