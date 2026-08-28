import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({
  title: z.string().trim().max(300).optional(),
  logoUrl: z.union([z.string().trim().url(), z.literal("")]).optional(),
  description: z.string().trim().max(2000).optional(),
  displayUrl: z.string().trim().url(),
  categoryId: z.string().uuid(),
});

// General listing-metadata edit — supersedes the old category-only route now
// that admins can correct everything a submitter (or extract-site-metadata)
// got wrong in one place.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi("admin");
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const { id } = await params;
  const { title, logoUrl, description, displayUrl, categoryId } = parsed.data;

  const { error } = await supabase
    .from("listings")
    .update({
      title: title || null,
      logo_url: logoUrl || null,
      description: description || null,
      display_url: displayUrl,
      category_id: categoryId,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Không lưu được listing." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
