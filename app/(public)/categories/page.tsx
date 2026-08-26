import Link from "next/link";
import { supabase } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export const revalidate = 30;

export default async function CategoriesPage() {
  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name_vi")
    .order("sort_order");

  const counts = await Promise.all(
    (categories ?? []).map((c) =>
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("category_id", c.id)
        .eq("status", "approved"),
    ),
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">Danh mục</h1>
      <ul className="mt-4 divide-y divide-border">
        {(categories ?? []).map((c, i) => (
          <li key={c.id} className="flex items-center justify-between py-3">
            <Link href={`/category/${c.slug}`} className="text-foreground hover:underline">
              {c.name_vi}
            </Link>
            <Badge variant="secondary">{counts[i].count ?? 0}</Badge>
          </li>
        ))}
      </ul>
    </main>
  );
}
