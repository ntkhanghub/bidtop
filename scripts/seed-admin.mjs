import "dotenv/config";
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { createClient } from "@supabase/supabase-js";

// One-off script — no public admin sign-up flow exists by design (S4-T1).
// Usage: node scripts/seed-admin.mjs <email> [admin|super_admin]
const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/seed-admin.mjs <email> [admin|super_admin]");
  process.exit(1);
}
const role = process.argv[3] === "admin" ? "admin" : "super_admin";

const password = randomBytes(18).toString("base64url");
const passwordHash = await hash(password);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { error } = await supabase
  .from("admin_users")
  .upsert({ email: email.toLowerCase(), password_hash: passwordHash, role }, { onConflict: "email" });

if (error) {
  console.error("Failed to seed admin:", error.message);
  process.exit(1);
}

console.log(`Admin account ready: ${email.toLowerCase()} (${role})`);
console.log(`Password (shown once here only — not stored anywhere else): ${password}`);
