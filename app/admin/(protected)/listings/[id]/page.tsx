import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";
import { EditForm } from "./edit-form";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("admin");
  const { id } = await params;

  const [{ data: listing }, { data: categories }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, logo_url, description, display_url, category_id, status")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, slug, name_vi").order("sort_order"),
  ]);
  if (!listing) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Chỉnh sửa listing</h1>
      <EditForm listing={listing} categories={categories ?? []} />
    </div>
  );
}
