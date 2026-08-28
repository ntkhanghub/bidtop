import * as cheerio from "cheerio";

// Best-effort site metadata for a brand-new listing's title/logo/description
// — never blocks or fails a submission; any failure here just leaves every
// field null. logo_url is a reference to the site's own icon (favicon/
// og:image), not a downloaded copy — no new storage dependency, matching
// CLAUDE.md's "no Supabase Storage" non-goal.

const FETCH_TIMEOUT_MS = 5000;
const MAX_LOGO_URL_LENGTH = 2000;

export type SiteMetadata = { title: string | null; logoUrl: string | null; description: string | null };

function toSafeLogoUrl(href: string, origin: string): string | null {
  try {
    const url = new URL(href, origin);
    if (url.protocol !== "http:" && url.protocol !== "https:" && url.protocol !== "data:") {
      return null;
    }
    if (url.href.length > MAX_LOGO_URL_LENGTH) return null;
    return url.href;
  } catch {
    return null;
  }
}

export async function extractSiteMetadata(pageUrl: string): Promise<SiteMetadata> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(pageUrl, { signal: controller.signal, redirect: "follow" });
    } finally {
      clearTimeout(timeout);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.includes("text/html")) {
      return { title: null, logoUrl: null, description: null };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const origin = new URL(res.url || pageUrl).origin;

    const title =
      $('meta[property="og:title"]').attr("content")?.trim() || $("title").first().text().trim() || null;

    const description =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      null;

    const logoHref =
      $('link[rel~="icon"]').first().attr("href") ||
      $('link[rel="apple-touch-icon"]').first().attr("href") ||
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      "/favicon.ico";

    return { title, logoUrl: toSafeLogoUrl(logoHref, origin), description };
  } catch {
    return { title: null, logoUrl: null, description: null };
  }
}
