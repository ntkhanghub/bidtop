-- Extracted site metadata, best-effort. logo_url points at the source
-- site's own icon/og:image — we don't download or host the image bytes
-- ourselves (see CLAUDE.md's "no Supabase Storage" non-goal). description
-- is the page's own <meta name="description">/og:description. Both null
-- until a successful extraction, and both stay null for @handle (social)
-- submissions since there's no public page to scrape.
alter table listings
  add column logo_url text,
  add column description text;
