-- 'unpublished' status + its own audit columns, kept separate from
-- reviewed_by/reviewed_at so a later unpublish action never overwrites the
-- original approve/reject record.
alter type listing_status add value 'unpublished';

alter table listings
  add column unpublished_by uuid references admin_users(id),
  add column unpublished_at timestamptz;
