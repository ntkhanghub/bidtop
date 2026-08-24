// Server-side content rules for a submitted listing URL — see F4's acceptance
// criteria in docs/specs/feature-spec.md. Two steps, always in this order:
// 1. resolveUrl() — follow redirects to the real destination (shorteners never
//    get stored as-is).
// 2. checkBannedPattern() — reject chat/group-invite platforms and anything
//    still sitting on a known shortener after resolution.

const SHORTENER_HOSTS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rebrand.ly",
  "shorturl.at",
]);

// Whole-domain bans: these platforms are chat/group-coordination tools, not
// accepted listing content (website or public social profile) — see
// docs/specs/tech-spec.md's content rules.
const BANNED_HOSTS = new Set([
  "t.me",
  "telegram.me",
  "discord.gg",
  "discord.com",
  "chat.whatsapp.com",
  "wa.me",
]);

export async function resolveUrl(url: string): Promise<string> {
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow" });
    return head.url || url;
  } catch {
    try {
      const get = await fetch(url, { method: "GET", redirect: "follow" });
      return get.url || url;
    } catch {
      return url;
    }
  }
}

export function checkBannedPattern(resolvedUrl: string): { ok: true } | { ok: false; reason: string } {
  let host: string;
  let path: string;
  try {
    const parsed = new URL(resolvedUrl);
    host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    path = parsed.pathname.toLowerCase();
  } catch {
    return { ok: false, reason: "Không đọc được đường dẫn đã resolve." };
  }

  if (BANNED_HOSTS.has(host)) {
    return { ok: false, reason: "Không chấp nhận link chat/mời nhóm (Telegram, Discord, WhatsApp)." };
  }

  if (host === "zalo.me" && path.startsWith("/g/")) {
    return { ok: false, reason: "Không chấp nhận link mời nhóm Zalo." };
  }

  if (SHORTENER_HOSTS.has(host)) {
    return { ok: false, reason: "Link rút gọn không resolve được ra đích thật." };
  }

  return { ok: true };
}
