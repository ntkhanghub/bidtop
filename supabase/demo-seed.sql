-- Demo listings for homepage testing. Safe to re-run (ON CONFLICT DO NOTHING).
insert into listings (identity_key, display_url, category_id, status, amount, first_confirmed_at, submitter_email)
select
  'contentsuper.com',
  'https://contentsuper.com/',
  id,
  'approved',
  100000,
  now(),
  'demo@bidtop.vn'
from categories where slug = 'seo-ai-visibility'
on conflict (identity_key) do nothing;

insert into listings (identity_key, display_url, category_id, status, amount, first_confirmed_at, submitter_email)
select
  'speakflowai.io',
  'https://speakflowai.io/',
  id,
  'approved',
  100000,
  now() + interval '1 second',
  'demo@bidtop.vn'
from categories where slug = 'education-learning'
on conflict (identity_key) do nothing;

insert into listings (identity_key, display_url, category_id, status, amount, first_confirmed_at, submitter_email)
select
  'phongvanmy.ungdungai.asia',
  'https://phongvanmy.ungdungai.asia/',
  id,
  'approved',
  100000,
  now() + interval '2 seconds',
  'demo@bidtop.vn'
from categories where slug = 'study-abroad'
on conflict (identity_key) do nothing;
