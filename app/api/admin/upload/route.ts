import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

// Cover-image upload only (not a general media library) — stores into Vercel
// Blob, the hosting platform's own storage, per the user's explicit call to
// keep Supabase as a Postgres-only boundary (see CLAUDE.md Non-goals).
export async function POST(request: Request) {
  const auth = await requireAdminApi("admin");
  if (!auth.ok) return auth.response;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Không có file." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Chỉ chấp nhận file ảnh." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Ảnh không được vượt quá 5MB." }, { status: 400 });
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const pathname = `blog-covers/${randomUUID()}.${ext}`;

  try {
    await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    // Returns our own domain's proxied path (see next.config.ts rewrites), not
    // the SDK's blob.url — Vercel Blob has no custom-domain feature itself.
    return NextResponse.json({ url: `/media/${pathname}` });
  } catch {
    return NextResponse.json({ error: "Không tải lên được ảnh." }, { status: 500 });
  }
}
