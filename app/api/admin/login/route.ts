import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Sai email hoặc mật khẩu." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, email, password_hash, role")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (!admin || !(await verifyPassword(admin.password_hash, password))) {
    return NextResponse.json({ error: "Sai email hoặc mật khẩu." }, { status: 401 });
  }

  const token = createSessionToken(admin.id, admin.email, admin.role);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ ok: true, role: admin.role });
}
