import { NextResponse } from "next/server";
import { z } from "zod";
import { createZaloPayOrder } from "@/lib/payment/zalopay";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({ bidId: z.string().uuid() });

// Kicks off a real ZaloPay checkout session for an already-created pending
// bid (app/api/listings/submit). Only talks to the gateway — never touches
// listings.amount/bids.status itself. Only the IPN webhook
// (app/api/webhooks/zalopay) is authorized to do that, per CLAUDE.md's
// rank-integrity rule.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu bidId." }, { status: 400 });
  }

  const { data: bid } = await supabase
    .from("bids")
    .select("id, gateway_order_id, total_charged, status")
    .eq("id", parsed.data.bidId)
    .maybeSingle();
  if (!bid) {
    return NextResponse.json({ error: "Không tìm thấy bid." }, { status: 404 });
  }
  if (bid.status !== "pending") {
    return NextResponse.json({ error: "Bid này đã được xử lý." }, { status: 409 });
  }

  // apptransid = bid.gateway_order_id (set once at submit time) — a reload or
  // double-click here re-requests an orderUrl for the SAME ZaloPay order
  // instead of minting a new one.
  const result = await createZaloPayOrder({
    apptransid: bid.gateway_order_id,
    appuser: bid.id,
    amount: bid.total_charged,
    description: "BidTop.vn - nâng hạng",
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ orderUrl: result.orderUrl });
}
