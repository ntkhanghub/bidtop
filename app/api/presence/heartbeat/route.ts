import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({ sessionId: z.string().uuid() });
const ONLINE_WINDOW_MS = 45_000;

// Public, unauthenticated — no accounts exist. Presence is per-tab, not tied
// to any identity: a random client-generated id, not derivable to a person.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu sessionId." }, { status: 400 });
  }

  await supabase
    .from("online_heartbeats")
    .upsert({ session_id: parsed.data.sessionId, last_seen: new Date().toISOString() });

  const { count } = await supabase
    .from("online_heartbeats")
    .select("session_id", { count: "exact", head: true })
    .gt("last_seen", new Date(Date.now() - ONLINE_WINDOW_MS).toISOString());

  return NextResponse.json({ count: count ?? 1 });
}
