import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";
import { CategoryForm } from "../category-form";

export default async function EditPostCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage("admin");
  const { id } = await params;

  const { data: category } = await supabase
    .from("post_categories")
    .select("id, slug, name_vi, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (!category) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Chỉnh sửa danh mục</h1>
      <CategoryForm category={category} />
    </div>
  );
}
