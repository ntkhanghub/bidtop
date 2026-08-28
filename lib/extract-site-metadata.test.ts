import { afterEach, describe, expect, it, vi } from "vitest";
import { extractSiteMetadata } from "./extract-site-metadata";

function htmlResponse(html: string, overrides: Partial<Response> = {}) {
  return {
    ok: true,
    url: "https://example.com/",
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    text: async () => html,
    ...overrides,
  } as Response;
}

describe("extractSiteMetadata", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts title, meta description, and icon link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        htmlResponse(`
          <html><head>
            <title>Example — the best product</title>
            <meta name="description" content="Best product ever">
            <link rel="icon" href="/favicon-32.png">
          </head></html>
        `),
      ),
    );
    const result = await extractSiteMetadata("https://example.com");
    expect(result).toEqual({
      title: "Example — the best product",
      logoUrl: "https://example.com/favicon-32.png",
      description: "Best product ever",
    });
  });

  it("falls back through og:title, og:description, apple-touch-icon, og:image, twitter:image", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        htmlResponse(`
          <html><head>
            <title>Fallback title (should be ignored)</title>
            <meta property="og:title" content="OG title">
            <meta property="og:description" content="OG description">
            <link rel="apple-touch-icon" href="https://cdn.example.com/touch-icon.png">
          </head></html>
        `),
      ),
    );
    const result = await extractSiteMetadata("https://example.com");
    expect(result).toEqual({
      title: "OG title",
      logoUrl: "https://cdn.example.com/touch-icon.png",
      description: "OG description",
    });
  });

  it("falls back to /favicon.ico and null title/description when nothing else exists", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => htmlResponse(`<html><head></head></html>`)));
    const result = await extractSiteMetadata("https://example.com/product");
    expect(result).toEqual({
      title: null,
      logoUrl: "https://example.com/favicon.ico",
      description: null,
    });
  });

  it("returns nulls for a non-HTML response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        htmlResponse("%PDF-1.4", { headers: new Headers({ "content-type": "application/pdf" }) }),
      ),
    );
    const result = await extractSiteMetadata("https://example.com/file.pdf");
    expect(result).toEqual({ title: null, logoUrl: null, description: null });
  });

  it("returns nulls when fetch fails or times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network error");
      }),
    );
    const result = await extractSiteMetadata("https://unreachable.example.com");
    expect(result).toEqual({ title: null, logoUrl: null, description: null });
  });

  it("rejects an unsafe logo href scheme", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        htmlResponse(`<html><head><link rel="icon" href="javascript:alert(1)"></head></html>`),
      ),
    );
    const result = await extractSiteMetadata("https://example.com");
    expect(result.logoUrl).toBeNull();
  });
});
