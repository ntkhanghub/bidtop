"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/slugify";

type Category = { id: string; slug: string; name_vi: string; sort_order: number };

export function CategoryForm({ category }: { category?: Category }) {
  const router = useRouter();
  const [nameVi, setNameVi] = useState(category?.name_vi ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 0));
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setNameVi(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const url = category
      ? `/api/admin/post-categories/${category.id}`
      : "/api/admin/post-categories";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameVi, slug, sortOrder: Number(sortOrder) || 0 }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(data.error ?? "Không lưu được danh mục.");
      return;
    }
    toast.success("Đã lưu danh mục");
    router.push("/panel-secure/post-categories");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex max-w-sm flex-col gap-4">
      <div>
        <Label htmlFor="nameVi">Tên</Label>
        <Input
          id="nameVi"
          value={nameVi}
          onChange={(e) => handleNameChange(e.target.value)}
          className="mt-1"
          required
        />
      </div>
      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          className="mt-1 font-mono"
          required
        />
      </div>
      <div>
        <Label htmlFor="sortOrder">Thứ tự</Label>
        <Input
          id="sortOrder"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="mt-1"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Đang lưu..." : "Lưu"}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/panel-secure/post-categories">Huỷ</Link>
        </Button>
      </div>
    </form>
  );
}
