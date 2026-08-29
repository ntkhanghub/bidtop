import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase/server";

// Replaces the old /out/[id] redirect (F14) now that listing links point
// straight at the real destination for a real dofollow backlink — this only
// records the click, it never redirects. Fire-and-forget from the client
// (see tracked-link.tsx), so failures here must never surface to the user.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabase.from("listing_clicks").insert({ listing_id: id });
  const { count } = await supabase
    .from("listing_clicks")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", id);

  return NextResponse.json({ clickCount: count ?? 0 });
}
