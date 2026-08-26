import { beforeAll, describe, expect, it } from "vitest";
import { createSepayCheckout, verifySepayIpnSecret } from "./sepay";

// Self-contained fixture credentials — deliberately NOT real .env values.
// Signing is pure local crypto (no network call), so these tests need no
// mocking and never touch SePay's servers.
beforeAll(() => {
  process.env.SEPAY_MERCHANT_ID = "test-merchant";
  process.env.SEPAY_SECRET_KEY = "test-secret";
});

describe("createSepayCheckout", () => {
  it("returns a sandbox checkout URL and a signed field set", async () => {
    const result = await createSepayCheckout({
      apptransid: "260826_abcd1234",
      appuser: "bid-123",
      amount: 150000,
      description: "BidTop.vn - nâng hạng",
      successUrl: "https://bidtop.vn/submit/return?outcome=success",
      errorUrl: "https://bidtop.vn/submit/return?outcome=error",
      cancelUrl: "https://bidtop.vn/submit/return?outcome=cancel",
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.checkoutUrl).toBe("https://pay-sandbox.sepay.vn/v1/checkout/init");
    expect(result.fields.order_invoice_number).toBe("260826_abcd1234");
    expect(result.fields.order_amount).toBe(150000);
    expect(result.fields.payment_method).toBe("BANK_TRANSFER");
    expect(result.fields.merchant).toBe("test-merchant");
    expect(typeof result.fields.signature).toBe("string");
    expect((result.fields.signature as string).length).toBeGreaterThan(0);
  });

  it("fails gracefully (no throw) when SEPAY_MERCHANT_ID is missing", async () => {
    const saved = process.env.SEPAY_MERCHANT_ID;
    delete process.env.SEPAY_MERCHANT_ID;
    try {
      const result = await createSepayCheckout({
        apptransid: "260826_abcd1234",
        appuser: "bid-123",
        amount: 150000,
        description: "test",
        successUrl: "https://bidtop.vn/submit/return?outcome=success",
        errorUrl: "https://bidtop.vn/submit/return?outcome=error",
        cancelUrl: "https://bidtop.vn/submit/return?outcome=cancel",
      });
      expect("error" in result).toBe(true);
    } finally {
      process.env.SEPAY_MERCHANT_ID = saved;
    }
  });
});

describe("verifySepayIpnSecret", () => {
  it("accepts the exact configured secret", () => {
    expect(verifySepayIpnSecret("test-secret")).toBe(true);
  });

  it("rejects a wrong secret", () => {
    expect(verifySepayIpnSecret("wrong-secret")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(verifySepayIpnSecret(null)).toBe(false);
  });
});
