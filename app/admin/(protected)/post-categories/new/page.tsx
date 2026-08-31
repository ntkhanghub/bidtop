import { requireAdminPage } from "@/lib/auth/require-admin";
import { CategoryForm } from "../category-form";

export default async function NewPostCategoryPage() {
  await requireAdminPage("admin");

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Thêm danh mục blog</h1>
      <CategoryForm />
    </div>
  );
}
