-- Blog/CMS module: post_categories, posts, pages. Plain tables, same admin
-- auth and RLS/grant conventions as the rest of the schema — no ORM, no
-- separate CMS auth system. See docs/sprints (not-a-sprint-task, user request).

create type post_status as enum ('draft', 'published');

create table post_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_vi text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text not null,
  cover_image_url text,
  -- not null: the public URL scheme is /{category-slug}/{post-slug}, so every
  -- post must belong to a category to be reachable at all.
  category_id uuid not null references post_categories (id),
  author_id uuid references admin_users (id),
  status post_status not null default 'draft',
  published_at timestamptz,
  meta_title text,
  meta_description text,
  -- Topical-cluster (pillar/cluster) SEO structure. A pillar post cannot
  -- itself be a cluster of another pillar — flat 2-level hierarchy only.
  is_pillar boolean not null default false,
  pillar_post_id uuid references posts (id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_pillar_hierarchy_chk check (not (is_pillar and pillar_post_id is not null))
);
create index posts_published_idx on posts (status, published_at desc);
create index posts_pillar_post_id_idx on posts (pillar_post_id);
create trigger posts_set_updated_at before update on posts
  for each row execute function set_updated_at();

create table pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  content text not null,
  status post_status not null default 'draft',
  meta_title text,
  meta_description text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger pages_set_updated_at before update on pages
  for each row execute function set_updated_at();

alter table post_categories enable row level security;
alter table posts enable row level security;
alter table pages enable row level security;

create policy "post_categories are publicly readable" on post_categories
  for select to anon, authenticated using (true);
create policy "published posts are publicly readable" on posts
  for select to anon, authenticated using (status = 'published');
create policy "published pages are publicly readable" on pages
  for select to anon, authenticated using (status = 'published');

grant all on post_categories, posts, pages to service_role;
grant select on post_categories, posts, pages to anon, authenticated;

-- Author byline. admin_users had no name field (id, email, password_hash,
-- role, created_at only) — email is PII and must never be rendered publicly,
-- so a real display name is needed to show a byline at all.
alter table admin_users add column display_name text;
