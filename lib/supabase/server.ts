import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Server-only: uses the service_role key, which bypasses RLS entirely. Never
// import this into a "use client" component — the key must never reach the browser.
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
