import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({ categoryId: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi("admin");
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Category không hợp lệ." }, { status: 400 });
  }
  const { id } = await params;

  const { error } = await supabase
    .from("listings")
    .update({ category_id: parsed.data.categoryId })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Không lưu được category." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
