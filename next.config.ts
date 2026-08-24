import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables forbidden()/unauthorized() (next/navigation) — used to return a real
  // 403 on /admin/settings for a plain admin session, per F9's acceptance
  // criteria ("a plain admin gets a 403, not just a hidden button").
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
