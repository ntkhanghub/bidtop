import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { getAdminSession } from "@/lib/auth/require-admin";
import { formatVnDate } from "@/lib/format-vn-datetime";
import { supabase } from "@/lib/supabase/server";

export const revalidate = 30;

async function getPost(slug: string, postSlug: string) {
  const { data: category } = await supabase
    .from("post_categories")
    .select("id, slug, name_vi")
    .eq("slug", slug)
    .maybeSingle();
  if (!category) return null;

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, title, slug, excerpt, content, cover_image_url, category_id, author_id, status, meta_title, meta_description, is_pillar, pillar_post_id, published_at",
    )
    .eq("slug", postSlug)
    .eq("category_id", category.id)
    .maybeSingle();
  if (!post) return null;

  return { category, post };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}): Promise<Metadata> {
  const { slug, postSlug } = await params;
  const found = await getPost(slug, postSlug);
  if (!found) return {};
  const { post } = found;
  return {
    title: post.meta_title ?? post.title,
    description: post.meta_description ?? post.excerpt ?? undefined,
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}) {
  const { slug, postSlug } = await params;
  const found = await getPost(slug, postSlug);
  if (!found) notFound();
  const { category, post } = found;

  const isDraft = post.status !== "published";
  if (isDraft && !(await getAdminSession())) notFound();

  const [{ data: author }, { data: clusters }, { data: pillar }] = await Promise.all([
    post.author_id
      ? supabase.from("admin_users").select("display_name").eq("id", post.author_id).maybeSingle()
      : Promise.resolve({ data: null }),
    post.is_pillar
      ? supabase
          .from("posts")
          .select("id, title, slug, excerpt, category_id")
          .eq("pillar_post_id", post.id)
          .eq("status", "published")
      : Promise.resolve({ data: null }),
    post.pillar_post_id
      ? supabase.from("posts").select("id, title, slug, category_id").eq("id", post.pillar_post_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const clusterCategoryIds = [...new Set((clusters ?? []).map((c) => c.category_id))];
  const pillarCategoryId = pillar?.category_id;
  const lookupCategoryIds = [...new Set([...clusterCategoryIds, ...(pillarCategoryId ? [pillarCategoryId] : [])])];
  const { data: lookupCategories } = lookupCategoryIds.length
    ? await supabase.from("post_categories").select("id, slug").in("id", lookupCategoryIds)
    : { data: [] };
  const categorySlugMap = new Map((lookupCategories ?? []).map((c) => [c.id, c.slug]));

  return (
    <main className="mx-auto max-w-[900px] px-4 py-12">
      {isDraft && (
        <div className="mb-4 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">
          Xem trước — bài viết chưa được đăng
        </div>
      )}

      {pillar && (
        <Link
          href={`/${categorySlugMap.get(pillar.category_id) ?? category.slug}/${pillar.slug}`}
          className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-3 py-1.5 text-sm text-accent hover:underline"
        >
          <Layers className="size-4" />
          Thuộc cụm chủ đề: {pillar.title}
        </Link>
      )}

      <p className="text-sm text-muted-foreground">
        <Link href={`/${category.slug}`} className="hover:underline">
          {category.name_vi}
        </Link>
        {post.published_at && <> · {formatVnDate(post.published_at)}</>}
        {author?.display_name && <> · {author.display_name}</>}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-foreground">{post.title}</h1>

      {post.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image_url}
          alt=""
          className="mt-6 h-64 w-full rounded-xl border border-border object-cover"
        />
      )}

      <div
        className="prose prose-neutral dark:prose-invert mt-6 max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {post.is_pillar && clusters && clusters.length > 0 && (
        <section className="mt-10 border-t border-border pt-6">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold text-foreground">
            <Layers className="size-4 text-accent" />
            Nội dung trong cụm chủ đề này ({clusters.length})
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {clusters.map((c) => (
              <Link
                key={c.id}
                href={`/${categorySlugMap.get(c.category_id) ?? category.slug}/${c.slug}`}
                className="rounded-lg bg-muted p-3 hover:bg-muted/70"
              >
                <p className="line-clamp-2 font-medium text-foreground">{c.title}</p>
                {c.excerpt && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.excerpt}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
