import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { verifyIpnMac, verifyReturnChecksum } from "./zalopay";

// Self-contained fixture keys — deliberately NOT the real .env ZALOPAY_KEY1/
// KEY2 (which may not even be set yet, see PROGRESS.md Blockers). Pure-logic
// round-trip tests only need consistent keys, not real credentials.
beforeAll(() => {
  process.env.ZALOPAY_KEY2 = "test-key2";
});

describe("verifyIpnMac", () => {
  it("accepts a mac computed the same way ZaloPay would (HMAC-SHA256 of the raw data string, key2)", () => {
    const dataStr = '{"apptransid":"260826_abcd1234","amount":150000,"zptransid":123456789}';
    const mac = createHmac("sha256", "test-key2").update(dataStr).digest("hex");
    expect(verifyIpnMac(dataStr, mac)).toBe(true);
  });

  it("rejects a tampered payload (mac no longer matches)", () => {
    const dataStr = '{"apptransid":"260826_abcd1234","amount":150000,"zptransid":123456789}';
    const mac = createHmac("sha256", "test-key2").update(dataStr).digest("hex");
    const tampered = dataStr.replace("150000", "999999");
    expect(verifyIpnMac(tampered, mac)).toBe(false);
  });

  it("rejects a mac signed with the wrong key", () => {
    const dataStr = '{"apptransid":"260826_abcd1234","amount":150000,"zptransid":123456789}';
    const mac = createHmac("sha256", "wrong-key").update(dataStr).digest("hex");
    expect(verifyIpnMac(dataStr, mac)).toBe(false);
  });
});

describe("verifyReturnChecksum", () => {
  const base = {
    appid: "1",
    apptransid: "260826_abcd1234",
    pmcid: "38",
    bankcode: "zalopayapp",
    amount: "150000",
    discountamount: "0",
    status: "1",
  };

  function checksumFor(p: typeof base) {
    return createHmac("sha256", "test-key2")
      .update([p.appid, p.apptransid, p.pmcid, p.bankcode, p.amount, p.discountamount, p.status].join("|"))
      .digest("hex");
  }

  it("accepts a correctly computed checksum", () => {
    const checksum = checksumFor(base);
    expect(verifyReturnChecksum({ ...base, checksum })).toBe(true);
  });

  it("rejects a checksum computed over different field values", () => {
    const checksum = checksumFor(base);
    expect(verifyReturnChecksum({ ...base, status: "2", checksum })).toBe(false);
  });
});
