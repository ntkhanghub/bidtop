import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { AdminRole } from "@/lib/supabase/database.types";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export async function getAdminSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

// For Server Component pages under app/admin/(protected) — redirects rather
// than rendering, since there's no logged-out state to show inline there.
export async function requireAdminPage(minRole: AdminRole = "admin") {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (minRole === "super_admin" && session.role !== "super_admin") redirect("/admin");
  return session;
}

// For Route Handlers — role must be enforced here even though the UI also
// hides admin-only actions, per CLAUDE.md: "never inferred from client-sent
// state." Returns a ready-to-return 401/403 NextResponse instead of throwing,
// so callers stay in control of the response shape.
export async function requireAdminApi(minRole: AdminRole = "admin") {
  const session = await getAdminSession();
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 }) };
  }
  if (minRole === "super_admin" && session.role !== "super_admin") {
    return { ok: false as const, response: NextResponse.json({ error: "Không đủ quyền." }, { status: 403 }) };
  }
  return { ok: true as const, session };
}
