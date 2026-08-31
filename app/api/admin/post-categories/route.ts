import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { RESERVED_SLUGS } from "@/lib/reserved-slugs";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({
  nameVi: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug không hợp lệ.")
    .refine((s) => !RESERVED_SLUGS.includes(s), "Slug này trùng với một route hệ thống, vui lòng chọn slug khác."),
  sortOrder: z.number().int().default(0),
});

export async function POST(request: Request) {
  const auth = await requireAdminApi("admin");
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }
  const { nameVi, slug, sortOrder } = parsed.data;

  const { error } = await supabase
    .from("post_categories")
    .insert({ name_vi: nameVi, slug, sort_order: sortOrder });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug này đã tồn tại." }, { status: 400 });
    }
    return NextResponse.json({ error: "Không tạo được danh mục." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
