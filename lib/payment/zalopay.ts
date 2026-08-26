import { createHmac, timingSafeEqual } from "node:crypto";

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
//
// CURRENTLY UNWIRED — the user asked to temporarily pause ZaloPay in favor of
// SePay (see lib/payment/sepay.ts, PROGRESS.md Decisions). This module and
// its route (app/api/payments/zalopay/create-order) are kept fully intact,
// still tested, ready to be re-wired (swap pending-confirm.tsx's fetch target
// back) whenever ZaloPay is reactivated — not deleted.
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

type CreateOrderResult = { orderUrl: string } | { error: string };

// Calls ZaloPay's createorder API. `apptransid` must already be
// bids.gateway_order_id (built via buildGatewayOrderId at submit time) so a
// page reload/retry re-requests an orderUrl for the SAME order instead of
// minting a new one. `amount` must be bids.total_charged (delta + VAT — the
// real charged total; listings.amount only ever moves by delta_amount, see
// the webhook handler).
export async function createZaloPayOrder(params: {
  apptransid: string;
  appuser: string;
  amount: number;
  description?: string;
}): Promise<CreateOrderResult> {
  let appid: string;
  let key1: string;
  try {
    appid = requireEnv("ZALOPAY_APP_ID");
    key1 = requireEnv("ZALOPAY_KEY1");
  } catch (err) {
    console.error("createZaloPayOrder:", err);
    return { error: "Thiếu cấu hình ZaloPay trên server." };
  }
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
  try {
    const key2 = requireEnv("ZALOPAY_KEY2");
    return timingSafeHexEqual(mac, hmacSha256Hex(key2, dataStr));
  } catch (err) {
    console.error("verifyIpnMac:", err);
    return false; // missing config must fail closed, never verify as valid
  }
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
  try {
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
  } catch (err) {
    console.error("verifyReturnChecksum:", err);
    return false; // missing config must fail closed, never verify as valid
  }
}
