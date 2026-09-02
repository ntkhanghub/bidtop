import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";
import { PageForm } from "../page-form";

export default async function EditStaticPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("admin");
  const { id } = await params;

  const { data: page } = await supabase
    .from("pages")
    .select("id, title, slug, content, status, meta_title, meta_description, data")
    .eq("id", id)
    .maybeSingle();
  if (!page) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Chỉnh sửa trang</h1>
      <PageForm page={page} />
    </div>
  );
}
