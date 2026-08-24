import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase/server";

// TEMPORARY — stands in for the real payment gateway (ZaloPay, Sprint 3) so the
// submit workflow is demoable end-to-end before that integration exists. Always
// "succeeds". Deliberately left ungated (reachable in production too) per an
// explicit user decision — see PROGRESS.md Decisions. Must be deleted once the
// real IPN webhook lands: per CLAUDE.md Safety rules, only a verified gateway
// webhook may call increment_listing_amount(), and this file is the only other
// caller in the codebase.
const bodySchema = z.object({ bidId: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu bidId." }, { status: 400 });
  }

  const { data: bid } = await supabase
    .from("bids")
    .select("id, listing_id, delta_amount, status")
    .eq("id", parsed.data.bidId)
    .maybeSingle();
  if (!bid) {
    return NextResponse.json({ error: "Không tìm thấy bid." }, { status: 404 });
  }

  // Idempotent: a bid already confirmed just returns the current listing state
  // instead of incrementing amount a second time (mirrors S3-T4's webhook-replay
  // requirement).
  if (bid.status !== "pending") {
    const { data: listing } = await supabase
      .from("listings")
      .select("amount, status")
      .eq("id", bid.listing_id)
      .single();
    return NextResponse.json({ amount: listing?.amount, status: listing?.status });
  }

  const { data: result, error: rpcError } = await supabase.rpc("increment_listing_amount", {
    p_listing_id: bid.listing_id,
    p_delta: bid.delta_amount,
  });
  if (rpcError || !result?.[0]) {
    return NextResponse.json({ error: "Không cập nhật được listing." }, { status: 500 });
  }

  await supabase
    .from("bids")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      gateway_txn_id: `mock-${randomUUID()}`,
    })
    .eq("id", bid.id);

  return NextResponse.json({ amount: result[0].amount, status: result[0].status });
}
