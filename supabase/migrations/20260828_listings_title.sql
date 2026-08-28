-- Extracted site title, best-effort — same pattern as logo_url/description
-- (20260827_listings_logo_description.sql). Null until a successful
-- extraction, and stays null for @handle (social) submissions.
alter table listings
  add column title text;
