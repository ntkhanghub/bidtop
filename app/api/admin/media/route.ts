import { list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";

// Lists previously uploaded cover images so the content editor's "Add Media"
// picker can reuse them instead of re-uploading — same blog-covers/ prefix as
// app/api/admin/upload/route.ts.
export async function GET() {
  const auth = await requireAdminApi("admin");
  if (!auth.ok) return auth.response;

  try {
    const { blobs } = await list({
      prefix: "blog-covers/",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      limit: 100,
    });
    return NextResponse.json({
      // Same "/media/<pathname>" proxied path as the upload route, not b.url —
      // keeps the gallery's thumbnails and inserted URLs consistent.
      items: blobs
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
        .map((b) => ({ url: `/media/${b.pathname}`, uploadedAt: b.uploadedAt })),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
