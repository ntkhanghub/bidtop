import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { RESERVED_SLUGS } from "@/lib/reserved-slugs";
import { sanitizePostHtml } from "@/lib/sanitize-post-html";
import { supabase } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(300),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug không hợp lệ.")
    .refine((s) => !RESERVED_SLUGS.includes(s), "Slug này trùng với một route hệ thống, vui lòng chọn slug khác."),
  content: z.string().min(1),
  status: z.enum(["draft", "published"]),
  metaTitle: z.string().trim().max(200).optional(),
  metaDescription: z.string().trim().max(300).optional(),
  data: z.string().optional(),
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
  const { title, slug, content, status, metaTitle, metaDescription, data } = parsed.data;

  let parsedData: Json = {};
  if (data) {
    try {
      parsedData = JSON.parse(data);
    } catch {
      return NextResponse.json({ error: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from("pages")
    .update({
      title,
      slug,
      content: sanitizePostHtml(content),
      status,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      data: parsedData,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug này đã tồn tại." }, { status: 400 });
    }
    return NextResponse.json({ error: "Không lưu được trang." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
