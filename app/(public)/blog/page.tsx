import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/server";
import { PostCard } from "../_components/post-card";
import { PostCategoryFilter } from "../_components/post-category-filter";

export const revalidate = 30;

const PAGE_SIZE = 12;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ data: posts, count }, { data: categories }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, slug, excerpt, cover_image_url, category_id, published_at", {
        count: "exact",
      })
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(from, to),
    supabase.from("post_categories").select("id, slug, name_vi"),
  ]);

  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c]));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-[900px] px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">Blog</h1>
      <div className="mt-4">
        <PostCategoryFilter categories={categories ?? []} />
      </div>

      {!posts || posts.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Chưa có bài viết nào.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {posts.map((post) => {
            const category = categoryMap.get(post.category_id);
            if (!category) return null;
            return (
              <PostCard
                key={post.id}
                post={post}
                categorySlug={category.slug}
                categoryName={category.name_vi}
              />
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center gap-2 text-sm">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={page - 1 > 1 ? `/blog?page=${page - 1}` : "/blog"}>
                <ChevronLeft /> Trước
              </Link>
            </Button>
          )}
          <span className="text-muted-foreground">
            Trang {page}/{totalPages}
          </span>
          {page < totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/blog?page=${page + 1}`}>
                Sau <ChevronRight />
              </Link>
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
