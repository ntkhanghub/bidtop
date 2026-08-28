"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Category = { slug: string; name_vi: string };

export function CategoryFilter({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4">
      <div className={cn("flex flex-wrap gap-2 overflow-hidden", !expanded && "max-h-9")}>
        <Link
          href="/"
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
            !activeSlug
              ? "border-transparent bg-accent text-accent-foreground"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          Tất cả
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              activeSlug === c.slug
                ? "border-transparent bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {c.name_vi}
          </Link>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-2 text-sm font-medium text-accent hover:underline"
      >
        {expanded ? "Thu gọn" : "Xem thêm"}
      </button>
    </div>
  );
}
