-- S4-T4: approve/reject must be logged (who, when). `rejection_reason` already
-- exists on listings for the "what" of a reject; these two columns cover
-- who/when for both approve and reject, without a separate audit table (the
-- moderation queue only needs the most recent review, not full history — see
-- PROGRESS.md Decisions).
alter table listings
  add column reviewed_by uuid references admin_users(id),
  add column reviewed_at timestamptz;
