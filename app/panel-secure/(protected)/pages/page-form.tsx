"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/slugify";
import type { PostStatus } from "@/lib/supabase/database.types";
import { HtmlContentEditor } from "../html-content-editor";

type Page = {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: PostStatus;
  meta_title: string | null;
  meta_description: string | null;
  data: unknown;
};

export function PageForm({ page }: { page?: Page }) {
  const router = useRouter();
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(page));
  const [content, setContent] = useState(page?.content ?? "");
  const [status, setStatus] = useState<PostStatus>(page?.status ?? "draft");
  const [metaTitle, setMetaTitle] = useState(page?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(page?.meta_description ?? "");
  const [dataJson, setDataJson] = useState(page?.data ? JSON.stringify(page.data, null, 2) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (dataJson.trim()) {
      try {
        JSON.parse(dataJson);
      } catch {
        setError("Dữ liệu JSON không hợp lệ.");
        return;
      }
    }

    setSubmitting(true);
    const url = page ? `/api/admin/pages/${page.id}` : "/api/admin/pages";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        content,
        status,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        data: dataJson.trim() || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(data.error ?? "Không lưu được trang.");
      return;
    }
    toast.success("Đã lưu trang");
    router.push("/panel-secure/pages");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Thêm tiêu đề"
          className="h-auto px-3 py-3 text-xl font-medium"
          required
        />

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
          <p className="mt-1 text-xs text-muted-foreground">Trang sẽ hiển thị tại /{slug || "..."}</p>
        </div>

        <div>
          <Label htmlFor="content">Nội dung</Label>
          <div className="mt-1">
            <HtmlContentEditor id="content" value={content} onChange={setContent} />
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">SEO</h2>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <Label htmlFor="metaTitle">Meta title</Label>
              <Input
                id="metaTitle"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="mt-1"
                placeholder={title || "Mặc định dùng Tiêu đề"}
              />
            </div>
            <div>
              <Label htmlFor="metaDescription">Meta description</Label>
              <Textarea
                id="metaDescription"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="dataJson">Dữ liệu JSON / Schema (tuỳ chọn)</Label>
          <Textarea
            id="dataJson"
            value={dataJson}
            onChange={(e) => setDataJson(e.target.value)}
            className="mt-1 font-mono"
            rows={4}
            placeholder="{}"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Đăng trang</h2>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <Label htmlFor="status">Trạng thái</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PostStatus)}>
                <SelectTrigger id="status" className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Nháp</SelectItem>
                  <SelectItem value="published">Đã đăng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang lưu..." : "Lưu trang"}
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/panel-secure/pages">Huỷ</Link>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
