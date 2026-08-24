import { afterEach, describe, expect, it, vi } from "vitest";
import { checkBannedPattern, resolveUrl } from "./content-validation";

describe("checkBannedPattern", () => {
  it("accepts a normal product site", () => {
    expect(checkBannedPattern("https://stripe.com/pricing")).toEqual({ ok: true });
  });

  it("rejects Telegram, Discord, and WhatsApp entirely", () => {
    expect(checkBannedPattern("https://t.me/somechannel").ok).toBe(false);
    expect(checkBannedPattern("https://discord.gg/abc123").ok).toBe(false);
    expect(checkBannedPattern("https://chat.whatsapp.com/xyz").ok).toBe(false);
    expect(checkBannedPattern("https://wa.me/1234567890").ok).toBe(false);
  });

  it("rejects a Zalo group invite but accepts a Zalo OA page", () => {
    expect(checkBannedPattern("https://zalo.me/g/abcdef").ok).toBe(false);
    expect(checkBannedPattern("https://zalo.me/somebrandoa").ok).toBe(true);
  });

  it("rejects a URL still sitting on a known shortener after resolution", () => {
    expect(checkBannedPattern("https://bit.ly/3xyz").ok).toBe(false);
  });
});

describe("resolveUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the final URL after a HEAD request follows redirects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ url: "https://real-destination.example.com/product" })),
    );
    const result = await resolveUrl("https://bit.ly/3xyz");
    expect(result).toBe("https://real-destination.example.com/product");
  });

  it("falls back to GET when HEAD fails", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("HEAD not allowed"))
      .mockResolvedValueOnce({ url: "https://real-destination.example.com/product" });
    vi.stubGlobal("fetch", fetchMock);
    const result = await resolveUrl("https://bit.ly/3xyz");
    expect(result).toBe("https://real-destination.example.com/product");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
