import { requireAdminPage } from "@/lib/auth/require-admin";
import { PageForm } from "../page-form";

export default async function NewStaticPage() {
  await requireAdminPage("admin");

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Tạo trang tĩnh</h1>
      <PageForm />
    </div>
  );
}
