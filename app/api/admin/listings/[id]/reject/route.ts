import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({ reason: z.string().trim().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi("admin");
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Cần nhập lý do từ chối." }, { status: 400 });
  }
  const { id } = await params;

  const { error } = await supabase
    .from("listings")
    .update({
      status: "rejected",
      rejection_reason: parsed.data.reason,
      reviewed_by: auth.session.adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "paid_pending_review");

  if (error) {
    return NextResponse.json({ error: "Không từ chối được." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
