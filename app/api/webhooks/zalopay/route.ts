import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyReadyForReview } from "@/lib/email/notify";
import { verifyIpnMac } from "@/lib/payment/zalopay";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({ data: z.string(), mac: z.string() });
const ipnDataSchema = z.object({
  apptransid: z.string(),
  amount: z.number(),
  zptransid: z.union([z.number(), z.string()]),
});

// CURRENTLY UNWIRED — ZaloPay is paused in favor of SePay (see
// lib/payment/sepay.ts, app/api/webhooks/sepay/route.ts, PROGRESS.md
// Decisions); no ZaloPay callback URL is registered anywhere right now. Kept
// intact, still correct (mac verification still gates every write), ready to
// re-wire if ZaloPay is reactivated.
//
// Allowed to call confirm_bid_and_increment() — see CLAUDE.md's
// rank-integrity rule. Mac is verified before any DB call; the response
// codes below follow ZaloPay's documented ack contract (1 = success/stop
// retrying, 0 = retry, anything else = failure).
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ returncode: -1, returnmessage: "invalid payload" });
  }
  const { data, mac } = parsed.data;

  if (!verifyIpnMac(data, mac)) {
    return NextResponse.json({ returncode: -1, returnmessage: "invalid mac" });
  }

  let parsedData: unknown;
  try {
    parsedData = JSON.parse(data);
  } catch {
    return NextResponse.json({ returncode: -1, returnmessage: "invalid data" });
  }
  const decoded = ipnDataSchema.safeParse(parsedData);
  if (!decoded.success) {
    return NextResponse.json({ returncode: -1, returnmessage: "invalid data" });
  }
  const ipn = decoded.data;

  const { data: bid } = await supabase
    .from("bids")
    .select("id, listing_id, delta_amount, total_charged, status")
    .eq("gateway_order_id", ipn.apptransid)
    .maybeSingle();
  if (!bid) {
    // Unknown apptransid (e.g. a stale/manual test order) — ack success so
    // ZaloPay stops retrying an order we'll never recognize.
    return NextResponse.json({ returncode: 1, returnmessage: "success" });
  }

  if (ipn.amount !== bid.total_charged) {
    // Mac already proves this payload is genuinely ZaloPay's, so a mismatch
    // here is only worth logging, not rejecting — the increment always uses
    // bid.delta_amount from our own DB, never this field, so it can't corrupt
    // the rank either way.
    console.warn(
      `ZaloPay IPN amount ${ipn.amount} != bids.total_charged ${bid.total_charged} for bid ${bid.id}`,
    );
  }

  if (bid.status === "confirmed") {
    return NextResponse.json({ returncode: 1, returnmessage: "success" });
  }

  const { data: result, error } = await supabase.rpc("confirm_bid_and_increment", {
    p_bid_id: bid.id,
    p_gateway_txn_id: String(ipn.zptransid),
  });
  if (error || !result?.[0]) {
    console.error("confirm_bid_and_increment failed:", error);
    return NextResponse.json({ returncode: 0, returnmessage: "retry" });
  }

  // Only fires for a genuinely new review-queue entry — a top-up on an
  // already-approved listing keeps status "approved", so it's naturally
  // excluded; a replayed webhook is excluded by the confirmed-check above.
  if (!result[0].already_confirmed && result[0].status === "paid_pending_review") {
    const { data: listing } = await supabase
      .from("listings")
      .select("display_url, submitter_email")
      .eq("id", bid.listing_id)
      .single();
    if (listing) {
      try {
        await notifyReadyForReview({
          displayUrl: listing.display_url,
          submitterEmail: listing.submitter_email,
        });
      } catch (err) {
        console.error("notifyReadyForReview failed:", err);
      }
    }
  }

  return NextResponse.json({ returncode: 1, returnmessage: "success" });
}
