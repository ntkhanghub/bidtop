import { timingSafeEqual } from "node:crypto";
import { SePayPgClient } from "sepay-pg-node";

// SePay Payment Gateway ("Cổng thanh toán SePay") via the official
// `sepay-pg-node` npm SDK. Contract verified against the package's real
// shipped source (v1.0.0, github.com/sepayvn/sepay-pg-node, MIT) and
// developer.sepay.vn's real payment-gateway docs — a separate docs site from
// docs.sepay.vn, which covers SePay's other product (bank-transfer webhooks).
//
// Checkout is a browser FORM POST, not a fetch-and-redirect like ZaloPay's
// orderUrl: `initCheckoutUrl()` returns a POST target, not something
// navigable via location.href. The caller must render a hidden <form> with
// every entry in `fields` as a hidden input and submit it — see
// app/(public)/submit/pending/pending-confirm.tsx.
//
// IPN auth is a shared-secret header (X-Secret-Key), not an HMAC-signed body
// like ZaloPay's — verified against developer.sepay.vn/en/cong-thanh-toan/IPN,
// and confirmed for real via a live production payload (2026-08-26): the
// merchant dashboard's "Cấu hình IPN" screen really does offer an Auth Type
// choice ("Không có" vs "Secret Key") — it must be set to "Secret Key" and
// the value must exactly match SEPAY_SECRET_KEY, or every delivery 401s
// silently (checkout still looks successful to the payer either way, since
// success_url fires independently of IPN success). Also confirmed for real:
// `order.order_amount` arrives as a STRING (e.g. "5000"), not a number as the
// public docs claimed ("long") — app/api/webhooks/sepay/route.ts coerces it.
// Still unverified: whether SePay retries on a non-200 IPN response at all,
// and whether `transaction.id` or `transaction.transaction_id` is the more
// meaningful field for gateway_txn_id (both are populated in practice).
//
// payment_method fixed to "BANK_TRANSFER" (QR chuyển khoản ngân hàng only, no
// card) — the user's explicit choice, see PROGRESS.md Decisions. A real
// sandbox exists for this merchant account (unlike ZaloPay), so SEPAY_ENV is
// a real env-configurable toggle; it fails safe to "sandbox" if unset rather
// than defaulting to production.
const PAYMENT_METHOD = "BANK_TRANSFER";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

type CreateCheckoutResult =
  | { checkoutUrl: string; fields: Record<string, string | number> }
  | { error: string };

// `apptransid` must already be bids.gateway_order_id (built via
// buildGatewayOrderId at submit time) so a page reload/retry re-requests
// checkout fields for the SAME order instead of minting a new one. `amount`
// must be bids.total_charged (delta + VAT — the real charged total;
// listings.amount only ever moves by delta_amount, see the webhook handler).
export async function createSepayCheckout(params: {
  apptransid: string;
  appuser: string;
  amount: number;
  description: string;
  successUrl: string;
  errorUrl: string;
  cancelUrl: string;
}): Promise<CreateCheckoutResult> {
  try {
    const merchant_id = requireEnv("SEPAY_MERCHANT_ID");
    const secret_key = requireEnv("SEPAY_SECRET_KEY");
    const env = process.env.SEPAY_ENV === "production" ? "production" : "sandbox";

    const client = new SePayPgClient({ env, merchant_id, secret_key });
    const rawFields = client.checkout.initOneTimePaymentFields({
      payment_method: PAYMENT_METHOD,
      order_invoice_number: params.apptransid,
      order_amount: params.amount,
      currency: "VND",
      order_description: params.description,
      customer_id: params.appuser,
      success_url: params.successUrl,
      error_url: params.errorUrl,
      cancel_url: params.cancelUrl,
    });
    // Normalizes to plain JSON-safe data (drops any undefined-valued
    // optional fields) — also exactly what crosses our own API boundary to
    // the client component that renders the hidden form.
    const fields = JSON.parse(JSON.stringify(rawFields)) as Record<string, string | number>;
    return { checkoutUrl: client.checkout.initCheckoutUrl(), fields };
  } catch (err) {
    console.error("createSepayCheckout:", err);
    return { error: "Thiếu cấu hình SePay trên server." };
  }
}

// IPN verification: SePay sends `X-Secret-Key: <secret_key>` on every
// callback (configured once in the merchant dashboard, not per-request).
// Constant-time compare, fails closed on any missing header/config or length
// mismatch — never verifies as valid on a configuration error.
export function verifySepayIpnSecret(headerValue: string | null): boolean {
  try {
    if (!headerValue) return false;
    const expected = requireEnv("SEPAY_SECRET_KEY");
    const given = Buffer.from(headerValue, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (given.length !== expectedBuf.length) return false;
    return timingSafeEqual(given, expectedBuf);
  } catch (err) {
    console.error("verifySepayIpnSecret:", err);
    return false;
  }
}
