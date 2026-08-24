import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase/server";

// F14 — records an outbound click server-side, then redirects with UTM params.
// Never touches the raw display_url directly from a leaderboard row's href;
// every public listing link routes through here first.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("display_url")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (!listing) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  await supabase.from("listing_clicks").insert({ listing_id: id });

  const target = new URL(listing.display_url);
  target.searchParams.set("utm_source", "bidtop");
  target.searchParams.set("utm_medium", "referral");
  target.searchParams.set("utm_campaign", "leaderboard");
  return NextResponse.redirect(target.toString());
}
