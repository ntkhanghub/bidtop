import { describe, expect, it } from "vitest";
import { buildGatewayOrderId } from "./order-id";

describe("buildGatewayOrderId", () => {
  it("matches ZaloPay's required yymmdd_xxxx format, well under 40 chars", () => {
    const id = buildGatewayOrderId();
    expect(id).toMatch(/^\d{6}_[0-9a-f]{8}$/);
    expect(id.length).toBeLessThanOrEqual(40);
  });

  it("is different on every call", () => {
    expect(buildGatewayOrderId()).not.toBe(buildGatewayOrderId());
  });
});
