import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";
import { PostCard } from "../_components/post-card";

export const revalidate = 30;

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const { data: page } = await supabase
    .from("pages")
    .select("title, meta_title, meta_description, status")
    .eq("slug", slug)
    .maybeSingle();
  if (page && page.status === "published") {
    return { title: page.meta_title ?? page.title, description: page.meta_description ?? undefined };
  }

  const { data: category } = await supabase
    .from("post_categories")
    .select("name_vi")
    .eq("slug", slug)
    .maybeSingle();
  if (category) return { title: category.name_vi };

  return {};
}

export default async function SlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;

  const { data: page } = await supabase
    .from("pages")
    .select("id, title, content, status")
    .eq("slug", slug)
    .maybeSingle();

  if (page) {
    const isDraft = page.status !== "published";
    if (isDraft && !(await getAdminSession())) notFound();

    return (
      <main className="mx-auto max-w-[900px] px-4 py-12">
        {isDraft && (
          <div className="mb-4 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">
            Xem trước — bài viết chưa được đăng
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground">{page.title}</h1>
        <div
          className="prose prose-neutral dark:prose-invert mt-6 max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </main>
    );
  }

  const { data: category } = await supabase
    .from("post_categories")
    .select("id, slug, name_vi")
    .eq("slug", slug)
    .maybeSingle();
  if (!category) notFound();

  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp.page) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: posts, count } = await supabase
    .from("posts")
    .select("id, title, slug, excerpt, cover_image_url, published_at", { count: "exact" })
    .eq("category_id", category.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-[900px] px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">{category.name_vi}</h1>

      {!posts || posts.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Chưa có bài viết nào.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} categorySlug={category.slug} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center gap-2 text-sm">
          {pageNum > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={pageNum - 1 > 1 ? `/${category.slug}?page=${pageNum - 1}` : `/${category.slug}`}>
                <ChevronLeft /> Trước
              </Link>
            </Button>
          )}
          <span className="text-muted-foreground">
            Trang {pageNum}/{totalPages}
          </span>
          {pageNum < totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/${category.slug}?page=${pageNum + 1}`}>
                Sau <ChevronRight />
              </Link>
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
