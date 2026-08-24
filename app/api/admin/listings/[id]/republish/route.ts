import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi("admin");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const { error } = await supabase
    .from("listings")
    .update({ status: "approved", unpublished_by: null, unpublished_at: null })
    .eq("id", id)
    .eq("status", "unpublished");

  if (error) {
    return NextResponse.json({ error: "Không đăng lại được listing." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
