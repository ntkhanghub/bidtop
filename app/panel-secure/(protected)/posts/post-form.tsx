"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CoverImageUpload } from "../cover-image-upload";
import { HtmlContentEditor } from "../html-content-editor";

const NO_PILLAR = "__none__";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category_id: string;
  status: PostStatus;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_pillar: boolean;
  pillar_post_id: string | null;
  data: unknown;
};
type Category = { id: string; slug: string; name_vi: string };
type PillarOption = { id: string; title: string };

// datetime-local inputs work in the browser's local time, with no timezone
// suffix — formatting/parsing both go through the Date object's local getters
// so what the admin sees matches what gets sent (new Date(thisString) also
// parses as local time when there's no "Z"/offset, so the round-trip is exact).
function toLocalDatetimeInputValue(iso: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PostForm({
  post,
  categories,
  pillarOptions,
}: {
  post?: Post;
  categories: Category[];
  pillarOptions: PillarOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [content, setContent] = useState(post?.content ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url ?? "");
  const [categoryId, setCategoryId] = useState(post?.category_id ?? categories[0]?.id ?? "");
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "draft");
  const [publishedAt, setPublishedAt] = useState(toLocalDatetimeInputValue(post?.published_at ?? null));
  const [metaTitle, setMetaTitle] = useState(post?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.meta_description ?? "");
  const [isPillar, setIsPillar] = useState(post?.is_pillar ?? false);
  const [pillarPostId, setPillarPostId] = useState(post?.pillar_post_id ?? NO_PILLAR);
  const [dataJson, setDataJson] = useState(post?.data ? JSON.stringify(post.data, null, 2) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availablePillars = pillarOptions.filter((p) => p.id !== post?.id);

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
    if (status === "published" && !publishedAt) {
      setError("Cần chọn ngày publish.");
      return;
    }

    setSubmitting(true);
    const url = post ? `/api/admin/posts/${post.id}` : "/api/admin/posts";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        excerpt: excerpt || undefined,
        content,
        coverImageUrl: coverImageUrl || undefined,
        categoryId,
        status,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        isPillar,
        pillarPostId: isPillar || pillarPostId === NO_PILLAR ? undefined : pillarPostId,
        data: dataJson.trim() || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(data.error ?? "Không lưu được bài viết.");
      return;
    }
    toast.success("Đã lưu bài viết");
    router.push("/panel-secure/posts");
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
        </div>

        <div>
          <Label htmlFor="content">Nội dung</Label>
          <div className="mt-1">
            <HtmlContentEditor id="content" value={content} onChange={setContent} />
          </div>
        </div>

        <div>
          <Label htmlFor="excerpt">Tóm tắt</Label>
          <Textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="mt-1"
            rows={2}
          />
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
                placeholder={excerpt || "Mặc định dùng Tóm tắt"}
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
          <h2 className="text-sm font-semibold text-foreground">Đăng bài</h2>
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
            <div>
              <Label htmlFor="publishedAt">Ngày publish</Label>
              <Input
                id="publishedAt"
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang lưu..." : "Lưu bài viết"}
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/panel-secure/posts">Huỷ</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <Label htmlFor="category">Danh mục</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category" className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name_vi}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border p-4">
          <CoverImageUpload value={coverImageUrl} onChange={setCoverImageUrl} />
        </div>

        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Cụm chủ đề (Pillar/Cluster)</h2>
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isPillar}
                onCheckedChange={(v) => {
                  setIsPillar(v === true);
                  if (v === true) setPillarPostId(NO_PILLAR);
                }}
              />
              Đây là bài Pillar (bài trụ cột)
            </label>
            {!isPillar && (
              <div>
                <Label htmlFor="pillarPostId">Thuộc Pillar nào</Label>
                <Select value={pillarPostId} onValueChange={setPillarPostId}>
                  <SelectTrigger id="pillarPostId" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PILLAR}>Không thuộc cụm nào</SelectItem>
                    {availablePillars.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
