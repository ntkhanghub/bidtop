import { createHmac, timingSafeEqual } from "node:crypto";
import type { AdminRole } from "@/lib/supabase/database.types";

export const SESSION_COOKIE = "bidtop_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h — small fixed set of admin accounts, no "remember me"

type SessionPayload = { adminId: string; role: AdminRole; exp: number };

function sign(payloadB64: string): string {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(payloadB64).digest("base64url");
}

export function createSessionToken(adminId: string, role: AdminRole): string {
  const payload: SessionPayload = {
    adminId,
    role,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

// Verifies the HMAC signature (constant-time) and expiry. Returns null on any
// tampering, malformed token, or expiry — callers treat null as "not logged in".
export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSignature = sign(payloadB64);
  const given = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}
