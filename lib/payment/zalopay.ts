import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// ZaloPay Gateway API (v001/tpe — the classic gateway product, distinct from
// ZaloPay's newer wallet-only Open API). Contract verified against
// developers.zalopay.vn's public docs; the exact response field names
// (returncode/returnmessage/orderurl/zptranstoken) were also confirmed live —
// an unauthenticated POST to the production endpoint returned exactly that
// shape. No sandbox exists for this merchant account (user's explicit
// confirmation), so ZALOPAY_BASE_URL is a fixed production constant, not an
// env-configurable toggle.
//
// Verified request/response example: PENDING — S3-T1 requires
// ZALOPAY_APP_ID/ZALOPAY_KEY1/ZALOPAY_KEY2 in .env (added by the user, never
// pasted into chat) to fire a real signed call. Until then this file's mac
// encoding (lowercase hex, matching the common VN-gateway convention e.g.
// VNPay/9Pay) and embeddata/item payload shape are unverified assumptions —
// confirm both against a real call before trusting a production payment.
//
// bankcode is fixed to "zalopayapp" (QR/ZaloPay-wallet only, no card entry) —
// the user's explicit choice, see PROGRESS.md Decisions.
const ZALOPAY_BASE_URL = "https://zalopay.com.vn";
const BANK_CODE = "zalopayapp";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function hmacSha256Hex(key: string, data: string): string {
  return createHmac("sha256", key).update(data).digest("hex");
}

function timingSafeHexEqual(givenHex: string, expectedHex: string): boolean {
  const given = Buffer.from(givenHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

// yymmdd_xxxxxxxx — ZaloPay requires apptransid unique per app per calendar
// day, formatted yymmdd_xxxx (≤40 chars). Computed from Vietnam local time
// (fixed UTC+7, no DST) rather than the server's raw UTC clock — Vercel
// functions run in UTC, so a naive UTC date would be wrong for any order
// placed 00:00-06:59 VN time. This value becomes bids.gateway_order_id
// (already the idempotency key) at bid-insert time — see
// app/api/listings/submit/route.ts.
export function buildApptransid(): string {
  const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const yy = String(vnNow.getUTCFullYear()).slice(-2);
  const mm = String(vnNow.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(vnNow.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}_${randomBytes(4).toString("hex")}`;
}

type CreateOrderResult = { orderUrl: string } | { error: string };

// Calls ZaloPay's createorder API. `apptransid` must already be
// bids.gateway_order_id (built via buildApptransid at submit time) so a page
// reload/retry re-requests an orderUrl for the SAME order instead of minting
// a new one. `amount` must be bids.total_charged (delta + VAT — the real
// charged total; listings.amount only ever moves by delta_amount, see the
// webhook handler).
export async function createZaloPayOrder(params: {
  apptransid: string;
  appuser: string;
  amount: number;
  description?: string;
}): Promise<CreateOrderResult> {
  const appid = requireEnv("ZALOPAY_APP_ID");
  const key1 = requireEnv("ZALOPAY_KEY1");
  const apptime = Date.now();
  // No per-order item breakdown needed for a rank top-up — an empty array is
  // valid JSON and satisfies the required-field constraint.
  const embeddata = JSON.stringify({});
  const item = JSON.stringify([]);
  const mac = hmacSha256Hex(
    key1,
    [appid, params.apptransid, params.appuser, params.amount, apptime, embeddata, item].join("|"),
  );

  const body = new URLSearchParams({
    appid,
    appuser: params.appuser,
    apptime: String(apptime),
    amount: String(params.amount),
    apptransid: params.apptransid,
    embeddata,
    item,
    bankcode: BANK_CODE,
    mac,
  });
  if (params.description) body.set("description", params.description);

  let res: Response;
  try {
    res = await fetch(`${ZALOPAY_BASE_URL}/v001/tpe/createorder`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    return { error: "Không kết nối được ZaloPay." };
  }

  const data = (await res.json().catch(() => null)) as {
    returncode?: number;
    returnmessage?: string;
    orderurl?: string;
  } | null;
  if (!data || data.returncode !== 1 || !data.orderurl) {
    return { error: data?.returnmessage || "ZaloPay từ chối tạo đơn hàng." };
  }
  return { orderUrl: data.orderurl };
}

// IPN callback verification: ZaloPay POSTs { data: "<json>", mac }, where
// mac = HMAC_SHA256(key2, data). `dataStr` must be the raw string as received
// (not a re-serialized JSON.stringify of the parsed object) — re-serializing
// can silently change key order/whitespace and break the signature.
export function verifyIpnMac(dataStr: string, mac: string): boolean {
  const key2 = requireEnv("ZALOPAY_KEY2");
  return timingSafeHexEqual(mac, hmacSha256Hex(key2, dataStr));
}

// Browser return-redirect checksum (display-only page, see
// app/(public)/submit/return) — a DIFFERENT formula from the IPN mac: it's
// computed over 7 pipe-joined fields with key2, not over the raw data string.
export function verifyReturnChecksum(params: {
  appid: string;
  apptransid: string;
  pmcid: string;
  bankcode: string;
  amount: string;
  discountamount: string;
  status: string;
  checksum: string;
}): boolean {
  const key2 = requireEnv("ZALOPAY_KEY2");
  const expected = hmacSha256Hex(
    key2,
    [
      params.appid,
      params.apptransid,
      params.pmcid,
      params.bankcode,
      params.amount,
      params.discountamount,
      params.status,
    ].join("|"),
  );
  return timingSafeHexEqual(params.checksum, expected);
}
