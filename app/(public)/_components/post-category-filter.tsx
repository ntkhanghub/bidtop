import Link from "next/link";
import { cn } from "@/lib/utils";

type PostCategory = { slug: string; name_vi: string };

export function PostCategoryFilter({
  categories,
  activeSlug,
}: {
  categories: PostCategory[];
  activeSlug?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <Link
        href="/blog"
        className={cn(
          "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
          !activeSlug
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        Tất cả
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/${c.slug}`}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
            activeSlug === c.slug
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          {c.name_vi}
        </Link>
      ))}
    </div>
  );
}
