import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { formatVnDateTime } from "@/lib/format-vn-datetime";
import { supabase } from "@/lib/supabase/server";
import type { PostStatus } from "@/lib/supabase/database.types";
import { POST_STATUS_BADGE } from "../post-status";

const PAGE_SIZE = 20;
const STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đã đăng" },
];

const nativeSelectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; page?: string }>;
}) {
  await requireAdminPage("admin");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const categoryId = params.category ?? "";
  const status: PostStatus | "" = STATUS_OPTIONS.some((s) => s.value === params.status)
    ? (params.status as PostStatus)
    : "";
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("posts")
    .select(
      "id, title, category_id, status, is_pillar, pillar_post_id, updated_at",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (categoryId) query = query.eq("category_id", categoryId);
  if (status) query = query.eq("status", status);
  if (q) query = query.ilike("title", `%${q.replace(/,/g, "")}%`);

  const [{ data: posts, count }, { data: categories }] = await Promise.all([
    query,
    supabase.from("post_categories").select("id, slug, name_vi").order("sort_order"),
  ]);

  const pillarIds = [...new Set((posts ?? []).map((p) => p.pillar_post_id).filter(Boolean))] as string[];
  const { data: pillars } = pillarIds.length
    ? await supabase.from("posts").select("id, title").in("id", pillarIds)
    : { data: [] };
  const pillarMap = new Map((pillars ?? []).map((p) => [p.id, p.title]));
  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c.name_vi]));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (categoryId) sp.set("category", categoryId);
    if (status) sp.set("status", status);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/admin/posts?${qs}` : "/admin/posts";
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Bài viết</h1>
        <Button asChild size="sm">
          <Link href="/admin/posts/new">Tạo bài viết</Link>
        </Button>
      </div>

      <form method="GET" className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Tìm theo tiêu đề..."
          className="h-9 w-56"
        />
        <select name="category" defaultValue={categoryId} className={nativeSelectClass}>
          <option value="">Tất cả danh mục</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_vi}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className={nativeSelectClass}>
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Lọc
        </Button>
      </form>

      {!posts || posts.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Không có bài viết nào khớp.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1.5 font-medium">Tiêu đề</th>
                <th className="py-1.5 font-medium">Danh mục</th>
                <th className="py-1.5 font-medium">Trạng thái</th>
                <th className="py-1.5 font-medium">Cụm chủ đề</th>
                <th className="py-1.5 font-medium">Cập nhật</th>
                <th className="py-1.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const badge = POST_STATUS_BADGE[post.status];
                return (
                  <tr key={post.id} className="border-b border-border/50">
                    <td className="max-w-64 truncate py-1.5">{post.title}</td>
                    <td className="py-1.5">{categoryMap.get(post.category_id) ?? "—"}</td>
                    <td className="py-1.5">
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </td>
                    <td className="py-1.5">
                      {post.is_pillar ? (
                        <Badge variant="secondary">Pillar</Badge>
                      ) : post.pillar_post_id ? (
                        <span className="text-xs text-muted-foreground">
                          Cluster của: {pillarMap.get(post.pillar_post_id) ?? "—"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-1.5 whitespace-nowrap">{formatVnDateTime(post.updated_at)}</td>
                    <td className="py-1.5 text-right">
                      <Link href={`/admin/posts/${post.id}`} className="text-sm hover:underline">
                        Sửa
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>
                <ChevronLeft /> Trước
              </Link>
            </Button>
          )}
          <span className="text-muted-foreground">
            Trang {page}/{totalPages}
          </span>
          {page < totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>
                Sau <ChevronRight />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
