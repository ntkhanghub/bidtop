// Canonical identity_key for a listing — the unique-dedup key stored in
// listings.identity_key. See docs/specs/tech-spec.md "Data model" and F4's
// acceptance criteria in docs/specs/feature-spec.md.
//
// Rules:
// - Plain websites: domain only (path/query/fragment stripped) — "stripe.com".
// - App Store / Play Store / GitHub: domain + path (query/fragment stripped) —
//   these platforms host many unrelated products under one domain, so the path
//   is the real identity. (Simplification: real App Store URLs can carry a
//   locale segment in the path, e.g. /us/app/..., which this treats as part of
//   the identity like any other path segment. Revisit only if that turns out to
//   cause real duplicate listings.)
// - Social handles: an "@handle" shorthand or a full profile URL on a known
//   social platform both resolve to the same key. Bare "@handle" is treated as
//   an X (Twitter) handle, matching the original outbid.lol convention.

const PATH_SIGNIFICANT_HOSTS = new Set(["apps.apple.com", "play.google.com", "github.com"]);

// Major social platforms — a profile/page URL here is path-significant (like
// PATH_SIGNIFICANT_HOSTS above) AND has no meaningful scrapable page meta
// (login-walled or client-rendered), so app/api/listings/submit/route.ts also
// uses this set to skip extractSiteMetadata for a full URL on any of these
// hosts, the same way it already skips it for a bare "@handle".
export const SOCIAL_PROFILE_HOSTS = new Set([
  "x.com",
  "facebook.com",
  "instagram.com",
  "pinterest.com",
  "tiktok.com",
  "linkedin.com",
  "threads.net",
  "threads.com",
]);

const HOST_ALIASES: Record<string, string> = {
  "twitter.com": "x.com",
};

function normalizeHost(hostname: string): string {
  let host = hostname.toLowerCase();
  if (host.startsWith("www.")) {
    host = host.slice(4);
  }
  return HOST_ALIASES[host] ?? host;
}

export function normalizeListingIdentity(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Identity input is empty");
  }

  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1);
    if (!handle) {
      throw new Error("Handle is empty");
    }
    return `x.com/${handle}`.toLowerCase();
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error(`Invalid URL: ${input}`);
  }

  const host = normalizeHost(url.hostname);

  if (!PATH_SIGNIFICANT_HOSTS.has(host) && !SOCIAL_PROFILE_HOSTS.has(host)) {
    return host;
  }

  // Play Store identifies the app via ?id=, not the path (the path is the
  // same "/store/apps/details" for every app) — everything else here uses
  // the path as the identity, and both drop every other query param.
  const identityPart =
    host === "play.google.com"
      ? `?id=${url.searchParams.get("id") ?? ""}`
      : url.pathname.replace(/\/+$/, "");

  return `${host}${identityPart}`.toLowerCase();
}

// Used by app/api/listings/submit/route.ts to decide whether a full profile
// URL (not just a bare "@handle") should skip extractSiteMetadata.
export function isSocialProfileUrl(url: string): boolean {
  try {
    return SOCIAL_PROFILE_HOSTS.has(normalizeHost(new URL(url).hostname));
  } catch {
    return false;
  }
}
