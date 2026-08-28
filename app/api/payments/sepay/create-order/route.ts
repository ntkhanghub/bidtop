import { NextResponse } from "next/server";
import { z } from "zod";
import { createSepayCheckout } from "@/lib/payment/sepay";
import { SITE_NAME } from "@/lib/site";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({ bidId: z.string().uuid() });

// Kicks off a real SePay checkout for an already-created pending bid
// (app/api/listings/submit). Only talks to the gateway — never touches
// listings.amount/bids.status itself. Only the IPN webhook
// (app/api/webhooks/sepay) is authorized to do that, per CLAUDE.md's
// rank-integrity rule. The checkout is a browser FORM POST, not a redirect:
// this returns { checkoutUrl, fields } for the client to submit as a hidden
// form, not a bare orderUrl.
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

  const result = await createSepayCheckout({
    apptransid: bid.gateway_order_id,
    appuser: bid.id,
    amount: bid.total_charged,
    description: `${SITE_NAME} - nâng hạng`,
    successUrl: new URL("/submit/return?outcome=success", request.url).toString(),
    errorUrl: new URL("/submit/return?outcome=error", request.url).toString(),
    cancelUrl: new URL("/submit/return?outcome=cancel", request.url).toString(),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ checkoutUrl: result.checkoutUrl, fields: result.fields });
}
