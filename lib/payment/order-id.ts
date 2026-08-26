import { randomBytes } from "node:crypto";

// yymmdd_xxxxxxxx — originated from ZaloPay's requirement that apptransid be
// unique per app per calendar day, formatted yymmdd_xxxx (≤40 chars). Kept as
// the shared gateway-agnostic generator for bids.gateway_order_id (the
// idempotency key for ANY payment gateway) since it's a strict superset of
// every gateway's own constraints seen so far (e.g. SePay's order_invoice_number
// is just an unconstrained string). Computed from Vietnam local time (fixed
// UTC+7, no DST) rather than the server's raw UTC clock — Vercel functions run
// in UTC, so a naive UTC date would be wrong for any order placed 00:00-06:59
// VN time. Set once at bid-insert time — see app/api/listings/submit/route.ts.
export function buildGatewayOrderId(): string {
  const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const yy = String(vnNow.getUTCFullYear()).slice(-2);
  const mm = String(vnNow.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(vnNow.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}_${randomBytes(4).toString("hex")}`;
}
