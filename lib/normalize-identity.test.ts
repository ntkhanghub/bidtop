import { describe, expect, it } from "vitest";
import { isSocialProfileUrl, normalizeListingIdentity } from "./normalize-identity";

describe("normalizeListingIdentity", () => {
  it("normalizes a plain domain the same with or without www. and a query string", () => {
    const a = normalizeListingIdentity("https://stripe.com");
    const b = normalizeListingIdentity("https://www.stripe.com?ref=twitter");
    const c = normalizeListingIdentity("stripe.com");
    expect(a).toBe("stripe.com");
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("distinguishes two different App Store app IDs", () => {
    const a = normalizeListingIdentity("https://apps.apple.com/app/123456");
    const b = normalizeListingIdentity("https://apps.apple.com/app/999999");
    expect(a).not.toBe(b);
  });

  it("treats the same App Store app ID with different query params as identical", () => {
    const a = normalizeListingIdentity("https://apps.apple.com/app/123456");
    const b = normalizeListingIdentity("https://apps.apple.com/app/123456?ref=producthunt");
    expect(a).toBe(b);
  });

  it("normalizes a bare @handle the same as its full profile URL", () => {
    const handle = normalizeListingIdentity("@elonmusk");
    const twitterUrl = normalizeListingIdentity("https://twitter.com/elonmusk");
    const xUrl = normalizeListingIdentity("https://x.com/elonmusk");
    expect(handle).toBe("x.com/elonmusk");
    expect(twitterUrl).toBe(handle);
    expect(xUrl).toBe(handle);
  });

  it("distinguishes different Play Store package paths", () => {
    const a = normalizeListingIdentity("https://play.google.com/store/apps/details?id=com.foo");
    const b = normalizeListingIdentity("https://play.google.com/store/apps/details?id=com.bar");
    expect(a).not.toBe(b);
  });

  it("distinguishes different GitHub repos, ignoring query strings", () => {
    const a = normalizeListingIdentity("https://github.com/vercel/next.js");
    const b = normalizeListingIdentity("https://github.com/vercel/next.js?tab=readme");
    const c = normalizeListingIdentity("https://github.com/facebook/react");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("rejects empty input", () => {
    expect(() => normalizeListingIdentity("")).toThrow();
    expect(() => normalizeListingIdentity("@")).toThrow();
  });

  it("keeps the profile path for a full URL on other major social platforms", () => {
    expect(normalizeListingIdentity("https://www.tiktok.com/@nganphan9x.photo")).toBe(
      "tiktok.com/@nganphan9x.photo",
    );
    expect(normalizeListingIdentity("https://www.facebook.com/zuck")).toBe("facebook.com/zuck");
    expect(normalizeListingIdentity("https://www.instagram.com/nasa")).toBe("instagram.com/nasa");
    expect(normalizeListingIdentity("https://www.linkedin.com/in/satyanadella")).toBe(
      "linkedin.com/in/satyanadella",
    );
    expect(normalizeListingIdentity("https://www.pinterest.com/nasa")).toBe("pinterest.com/nasa");
    expect(normalizeListingIdentity("https://www.threads.net/@nasa")).toBe("threads.net/@nasa");
  });

  it("distinguishes two different profiles on the same social platform", () => {
    const a = normalizeListingIdentity("https://tiktok.com/@alice");
    const b = normalizeListingIdentity("https://tiktok.com/@bob");
    expect(a).not.toBe(b);
  });
});

describe("isSocialProfileUrl", () => {
  it("recognizes known social platform hosts", () => {
    for (const url of [
      "https://x.com/elonmusk",
      "https://www.facebook.com/zuck",
      "https://www.instagram.com/nasa",
      "https://www.pinterest.com/nasa",
      "https://www.tiktok.com/@nganphan9x.photo",
      "https://www.linkedin.com/in/satyanadella",
      "https://www.threads.net/@nasa",
    ]) {
      expect(isSocialProfileUrl(url)).toBe(true);
    }
  });

  it("returns false for a plain website", () => {
    expect(isSocialProfileUrl("https://stripe.com")).toBe(false);
  });

  it("returns false for an unparseable URL", () => {
    expect(isSocialProfileUrl("not a url")).toBe(false);
  });
});
