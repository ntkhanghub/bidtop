import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { DeleteCategoryButton } from "./delete-category-button";

export default async function AdminPostCategoriesPage() {
  await requireAdminPage("admin");

  const { data: categories } = await supabase
    .from("post_categories")
    .select("id, slug, name_vi, sort_order")
    .order("sort_order");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Danh mục blog</h1>
        <Button asChild size="sm">
          <Link href="/admin/post-categories/new">Thêm danh mục</Link>
        </Button>
      </div>

      {!categories || categories.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Chưa có danh mục nào.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1.5 font-medium">Tên</th>
                <th className="py-1.5 font-medium">Slug</th>
                <th className="py-1.5 font-medium">Thứ tự</th>
                <th className="py-1.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-border/50">
                  <td className="py-1.5">{category.name_vi}</td>
                  <td className="py-1.5 font-mono text-xs text-muted-foreground">
                    {category.slug}
                  </td>
                  <td className="py-1.5 tabular-nums">{category.sort_order}</td>
                  <td className="py-1.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/post-categories/${category.id}`}
                        className="text-sm hover:underline"
                      >
                        Sửa
                      </Link>
                      <DeleteCategoryButton categoryId={category.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
