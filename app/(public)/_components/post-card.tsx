import Link from "next/link";
import { formatVnDate } from "@/lib/format-vn-datetime";

export type PostCardData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
};

export function PostCard({
  post,
  categorySlug,
  categoryName,
}: {
  post: PostCardData;
  categorySlug: string;
  categoryName?: string;
}) {
  return (
    <Link
      href={`/${categorySlug}/${post.slug}`}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card hover:border-accent"
    >
      {post.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_image_url} alt="" className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-muted text-2xl font-bold text-muted-foreground">
          {post.title.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {categoryName && (
          <span className="text-xs font-medium text-accent">{categoryName}</span>
        )}
        <h3 className="line-clamp-2 font-medium text-foreground">{post.title}</h3>
        {post.excerpt && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
        )}
        {post.published_at && (
          <p className="mt-auto pt-1 text-xs text-muted-foreground">
            {formatVnDate(post.published_at)}
          </p>
        )}
      </div>
    </Link>
  );
}
