import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase/server";
import { Leaderboard } from "../../_components/leaderboard";

export const revalidate = 30;

const PAGE_SIZE = 50;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: category } = await supabase
    .from("categories")
    .select("id, name_vi, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!category) notFound();

  const [{ data: listings, count, error }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, display_url, amount", { count: "exact" })
      .eq("status", "approved")
      .eq("category_id", category.id)
      .order("amount", { ascending: false })
      .order("first_confirmed_at", { ascending: true })
      .range(from, to),
    supabase.from("settings").select("key, value").in("key", ["min_increment", "starting_price"]),
  ]);
  if (error) throw error;

  const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, Number(s.value)]));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">{category.name_vi}</h1>
      <Leaderboard
        listings={listings ?? []}
        page={page}
        pageSize={PAGE_SIZE}
        totalPages={totalPages}
        minIncrement={settings.min_increment ?? 50000}
        startingPrice={settings.starting_price ?? 100000}
        baseHref={`/category/${category.slug}`}
      />
    </main>
  );
}
