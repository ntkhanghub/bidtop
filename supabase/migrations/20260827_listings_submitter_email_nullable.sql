-- Ownership-by-email is removed (user's explicit decision, 2026-08-27): any
-- submitter may top up any existing listing, and email is no longer required
-- at checkout. Makes the column nullable rather than dropping it — it's
-- still collected (optionally) for admin contact purposes, just no longer
-- enforced as a match for top-up eligibility. See PROGRESS.md Decisions and
-- docs/specs/tech-spec.md's "Guest identity model" section.
alter table listings alter column submitter_email drop not null;
