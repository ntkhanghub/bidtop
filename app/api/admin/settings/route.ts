import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({
  starting_price: z.number().int().positive(),
  min_increment: z.number().int().positive(),
  vat_percent: z.number().int().min(0).max(100),
  show_click_count: z.boolean(),
});

export async function POST(request: Request) {
  const auth = await requireAdminApi("super_admin");
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Giá trị không hợp lệ." }, { status: 400 });
  }

  const rows = Object.entries(parsed.data).map(([key, value]) => ({
    key,
    value: String(value),
    updated_by: auth.session.adminId,
  }));

  const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
  if (error) {
    return NextResponse.json({ error: "Không lưu được cài đặt." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
