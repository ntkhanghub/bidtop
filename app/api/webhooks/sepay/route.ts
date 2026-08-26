import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyReadyForReview } from "@/lib/email/notify";
import { verifySepayIpnSecret } from "@/lib/payment/sepay";
import { supabase } from "@/lib/supabase/server";

const notificationTypeSchema = z.object({ notification_type: z.string() });
const orderPaidSchema = z.object({
  notification_type: z.literal("ORDER_PAID"),
  order: z.object({
    order_invoice_number: z.string(),
    // Real payloads send this as a string ("5000"), not a number as SePay's
    // public docs claimed ("long") — confirmed via a live Vercel log capture
    // after every prior fix attempt still failed. z.coerce handles both
    // shapes so it doesn't matter which SePay sends going forward.
    order_amount: z.coerce.number(),
  }),
  transaction: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    transaction_id: z.union([z.string(), z.number()]).optional(),
  }),
});

// The active gateway's IPN handler (ZaloPay's equivalent is paused, see
// PROGRESS.md Decisions) — the only place allowed to call
// confirm_bid_and_increment(), per CLAUDE.md's rank-integrity rule. Verifies
// the X-Secret-Key header before any DB call. Uses real HTTP status codes
// (401/400/500) rather than ZaloPay's always-200-with-body-code, matching
// SePay's documented "must return HTTP 200" ack contract literally — no
// alternate body-code convention is documented for SePay.
//
// NEVER log the raw request body: SePay's payload can carry
// card_number/card_holder_name/card_expiry (see CLAUDE.md "no card data ever
// touches our servers or logs") — only ever log extracted, non-card fields.
// TEMPORARY diagnostic logging — Sprint 3's SePay integration is failing to
// confirm real IPN deliveries in production for an unknown reason (secret
// header + IPN URL config already double-checked and fixed once, still
// failing) and there's no other way to inspect what SePay is actually
// sending. Logs only structural/non-sensitive info: header presence, top-
// level JSON keys, notification_type, order_invoice_number/order_amount,
// zod issue paths — NEVER full request bodies or card_number/card_holder_
// name/card_expiry (see CLAUDE.md "no card data ever touches our servers or
// logs"). Remove once the real payload shape is confirmed and this route is
// working — see PROGRESS.md.
export async function POST(request: Request) {
  const secretHeader = request.headers.get("x-secret-key");
  console.log(
    `SePay IPN received: secret header present=${secretHeader !== null}, length=${secretHeader?.length ?? 0}`,
  );
  if (!verifySepayIpnSecret(secretHeader)) {
    return NextResponse.json({ error: "invalid secret" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  console.log(
    `SePay IPN body top-level keys: ${body && typeof body === "object" ? Object.keys(body).join(",") : "not-an-object"}`,
  );

  const typeCheck = notificationTypeSchema.safeParse(body);
  if (!typeCheck.success) {
    console.log("SePay IPN: notification_type missing/not a string:", typeCheck.error.issues);
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  console.log("SePay IPN notification_type:", typeCheck.data.notification_type);
  // Other notification types (e.g. TRANSACTION_VOID) are acked as a no-op
  // rather than rejected — parsing only the discriminator first, before
  // applying the stricter ORDER_PAID schema, avoids silently dropping a
  // legitimate but less-common notification due to an over-strict shape.
  if (typeCheck.data.notification_type !== "ORDER_PAID") {
    return NextResponse.json({ ok: true });
  }

  const parsed = orderPaidSchema.safeParse(body);
  if (!parsed.success) {
    console.log(
      "SePay IPN: ORDER_PAID payload didn't match expected shape:",
      JSON.stringify(parsed.error.issues),
    );
    const bodyRecord = body as Record<string, unknown>;
    console.log(
      "SePay IPN order/transaction top-level keys:",
      JSON.stringify({
        orderKeys:
          bodyRecord.order && typeof bodyRecord.order === "object"
            ? Object.keys(bodyRecord.order)
            : null,
        transactionKeys:
          bodyRecord.transaction && typeof bodyRecord.transaction === "object"
            ? Object.keys(bodyRecord.transaction)
            : null,
      }),
    );
    return NextResponse.json({ error: "invalid ORDER_PAID payload" }, { status: 400 });
  }
  console.log(
    `SePay IPN parsed: order_invoice_number=${parsed.data.order.order_invoice_number}, order_amount=${parsed.data.order.order_amount}`,
  );
  const { order, transaction } = parsed.data;

  const { data: bid } = await supabase
    .from("bids")
    .select("id, listing_id, delta_amount, total_charged, status")
    .eq("gateway_order_id", order.order_invoice_number)
    .maybeSingle();
  if (!bid) {
    console.log(`SePay IPN: no bid found for gateway_order_id=${order.order_invoice_number}`);
    // Unknown order_invoice_number (e.g. a stale/manual test order) — ack so
    // SePay doesn't keep retrying an order we'll never recognize.
    return NextResponse.json({ ok: true });
  }

  if (order.order_amount !== bid.total_charged) {
    // The secret header already proves this payload is genuinely SePay's, so
    // a mismatch here is only worth logging — the increment always uses
    // bid.delta_amount from our own DB, never this field.
    console.warn(
      `SePay IPN amount ${order.order_amount} != bids.total_charged ${bid.total_charged} for bid ${bid.id}`,
    );
  }

  if (bid.status === "confirmed") {
    console.log(`SePay IPN: bid ${bid.id} already confirmed, no-op`);
    return NextResponse.json({ ok: true });
  }

  // Prefer transaction.id (SePay's own surrogate key) over transaction_id —
  // unverified which is guaranteed populated; confirm against a real sandbox
  // payload (see lib/payment/sepay.ts's top comment) and swap if needed.
  const gatewayTxnId = String(transaction.id ?? transaction.transaction_id ?? "unknown");

  const { data: result, error } = await supabase.rpc("confirm_bid_and_increment", {
    p_bid_id: bid.id,
    p_gateway_txn_id: gatewayTxnId,
  });
  if (error || !result?.[0]) {
    console.error("confirm_bid_and_increment failed:", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }

  // Only fires for a genuinely new review-queue entry — a top-up on an
  // already-approved listing keeps status "approved", so it's naturally
  // excluded; a replayed IPN is excluded by the confirmed-check above.
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

  console.log(`SePay IPN: bid ${bid.id} confirmed, listing ${bid.listing_id} status=${result[0].status}`);
  return NextResponse.json({ ok: true });
}
