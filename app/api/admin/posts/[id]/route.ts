import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { sanitizePostHtml } from "@/lib/sanitize-post-html";
import { supabase } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const bodySchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug không hợp lệ."),
    excerpt: z.string().trim().max(500).optional(),
    content: z.string().min(1),
    coverImageUrl: z.union([z.string().trim().url(), z.literal("")]).optional(),
    categoryId: z.string().uuid(),
    status: z.enum(["draft", "published"]),
    publishedAt: z.string().optional(),
    metaTitle: z.string().trim().max(200).optional(),
    metaDescription: z.string().trim().max(300).optional(),
    isPillar: z.boolean(),
    pillarPostId: z.string().uuid().optional(),
    data: z.string().optional(),
  })
  .refine((val) => !(val.isPillar && val.pillarPostId), {
    message: "Bài Pillar không thể vừa là cluster của bài khác.",
    path: ["pillarPostId"],
  })
  .refine((val) => val.status !== "published" || Boolean(val.publishedAt), {
    message: "Cần chọn ngày publish.",
    path: ["publishedAt"],
  })
  .refine((val) => !val.publishedAt || !Number.isNaN(new Date(val.publishedAt).getTime()), {
    message: "Ngày publish không hợp lệ.",
    path: ["publishedAt"],
  });

// General post edit — mirrors app/api/admin/listings/[id]/route.ts. Never
// touches author_id (set once, at creation, from the session).
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
  const {
    title,
    slug,
    excerpt,
    content,
    coverImageUrl,
    categoryId,
    status,
    publishedAt,
    metaTitle,
    metaDescription,
    isPillar,
    pillarPostId,
    data,
  } = parsed.data;

  let parsedData: Json = {};
  if (data) {
    try {
      parsedData = JSON.parse(data);
    } catch {
      return NextResponse.json({ error: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
    }
  }

  if (pillarPostId) {
    const { data: pillarPost } = await supabase
      .from("posts")
      .select("is_pillar")
      .eq("id", pillarPostId)
      .maybeSingle();
    if (!pillarPost?.is_pillar) {
      return NextResponse.json({ error: "Bài được chọn không phải là bài Pillar." }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from("posts")
    .update({
      title,
      slug,
      excerpt: excerpt || null,
      content: sanitizePostHtml(content),
      cover_image_url: coverImageUrl || null,
      category_id: categoryId,
      status,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      is_pillar: isPillar,
      pillar_post_id: pillarPostId || null,
      data: parsedData,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug này đã tồn tại." }, { status: 400 });
    }
    return NextResponse.json({ error: "Không lưu được bài viết." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
