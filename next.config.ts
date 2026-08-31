import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables forbidden()/unauthorized() (next/navigation) — used to return a real
  // 403 on /admin/settings for a plain admin session, per F9's acceptance
  // criteria ("a plain admin gets a 403, not just a hidden button").
  experimental: {
    authInterrupts: true,
  },
  // Reverse-proxies uploaded blog images through our own domain instead of the
  // raw *.public.blob.vercel-storage.com URL — Vercel Blob has no custom-domain
  // feature of its own (confirmed against its docs), so this is the only way to
  // make image links read as bidtopvn.com. User's explicit call, accepting the
  // Fast Data Transfer cost vs. direct Blob CDN delivery. See
  // app/api/admin/upload/route.ts and app/api/admin/media/route.ts, which return
  // "/media/<pathname>" rather than the SDK's own blob.url.
  async rewrites() {
    if (!process.env.BLOB_PUBLIC_BASE_URL) return [];
    return [{ source: "/media/:path*", destination: `${process.env.BLOB_PUBLIC_BASE_URL}/:path*` }];
  },
};

export default nextConfig;
