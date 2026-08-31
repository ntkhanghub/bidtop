// Literal top-level segments this app already serves under app/(public)/ and
// app/(admin), plus Next.js's own /api. A post_categories.slug or pages.slug
// equal to one of these would be silently unreachable — Next.js always
// prefers a static route segment over the dynamic app/(public)/[slug] one.
export const RESERVED_SLUGS = [
  "admin",
  "api",
  "submit",
  "categories",
  "category",
  "listing",
  "rules",
  "about",
  "blog",
  "media",
];
