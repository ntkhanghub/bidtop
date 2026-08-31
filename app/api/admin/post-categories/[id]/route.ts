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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi("admin");
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }
  const { id } = await params;
  const { nameVi, slug, sortOrder } = parsed.data;

  const { error } = await supabase
    .from("post_categories")
    .update({ name_vi: nameVi, slug, sort_order: sortOrder })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug này đã tồn tại." }, { status: 400 });
    }
    return NextResponse.json({ error: "Không lưu được danh mục." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi("admin");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { error } = await supabase.from("post_categories").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Danh mục đang có bài viết, không thể xoá." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Không xoá được danh mục." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
