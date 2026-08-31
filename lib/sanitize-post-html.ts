import sanitizeHtml from "sanitize-html";

// Admin-authored raw HTML (posts.content / pages.content) — only admin/super_admin
// accounts can ever write this (no public authoring path), but it's still
// sanitized at write time before it's ever rendered via dangerouslySetInnerHTML
// on public pages. Defense in depth, not a trust boundary against admins.
export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "figure", "figcaption"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "width", "height", "loading"],
      a: ["href", "name", "target", "rel", "title"],
    },
  });
}
