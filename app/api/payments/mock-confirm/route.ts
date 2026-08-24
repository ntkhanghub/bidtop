import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyReadyForReview } from "@/lib/email/notify";
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

  // Only fires for a genuinely new review-queue entry — a top-up on an
  // already-approved listing keeps status "approved" per the RPC's own logic,
  // so it's naturally excluded here. This call must move into the real
  // ZaloPay webhook once Sprint 3 builds it (this whole file gets deleted then).
  if (result[0].status === "paid_pending_review") {
    const { data: listing } = await supabase
      .from("listings")
      .select("display_url, submitter_email")
      .eq("id", bid.listing_id)
      .single();
    if (listing) {
      try {
        await notifyReadyForReview({ displayUrl: listing.display_url, submitterEmail: listing.submitter_email });
      } catch (err) {
        console.error("notifyReadyForReview failed:", err);
      }
    }
  }

  return NextResponse.json({ amount: result[0].amount, status: result[0].status });
}
