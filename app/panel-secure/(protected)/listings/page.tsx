import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getClickCounts } from "@/lib/get-click-counts";
import { supabase } from "@/lib/supabase/server";
import type { ListingStatus } from "@/lib/supabase/database.types";
import { ListingRow } from "./listing-row";

const PAGE_SIZE = 20;
const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Đã từ chối" },
  { value: "unpublished", label: "Đã gỡ" },
  { value: "draft", label: "Nháp" },
  { value: "pending_payment", label: "Chờ thanh toán" },
];

const SORT_KEYS = ["title", "amount", "click_count", "created_at", "updated_at"] as const;
type SortKey = (typeof SORT_KEYS)[number];
const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "title", label: "Listing" },
  { key: "amount", label: "Số tiền" },
  { key: "click_count", label: "Total click" },
  { key: "created_at", label: "Ngày tạo" },
  { key: "updated_at", label: "Ngày update" },
];

// Plain native <select>s here (not the shadcn Select) — this form is a zero-JS
// server-rendered GET form (bookmarkable URLs, no client component needed);
// Radix's Select can't participate in native form submission the same way.
const nativeSelectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const categoryId = params.category ?? "";
  const status: ListingStatus = STATUS_OPTIONS.some((s) => s.value === params.status)
    ? (params.status as ListingStatus)
    : "approved";
  const page = Math.max(1, Number(params.page) || 1);
  const sort: SortKey = SORT_KEYS.includes(params.sort as SortKey)
    ? (params.sort as SortKey)
    : "created_at";
  const dir: "asc" | "desc" = params.dir === "asc" ? "asc" : "desc";

  let query = supabase
    .from("listings")
    .select(
      "id, title, logo_url, display_url, identity_key, category_id, submitter_email, amount, status, rejection_reason, unpublished_at, created_at, updated_at",
    )
    .eq("status", status);

  if (categoryId) query = query.eq("category_id", categoryId);
  if (q) {
    const escaped = q.replace(/,/g, "");
    query = query.or(
      `display_url.ilike.%${escaped}%,identity_key.ilike.%${escaped}%,submitter_email.ilike.%${escaped}%`,
    );
  }

  const [{ data: matched }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("id, slug, name_vi").order("sort_order"),
  ]);
  const listings = matched ?? [];

  // Total click isn't a stored column — same per-listing head-count query
  // pattern as the public leaderboard's getClickCounts. Sorting by it (or
  // pairing DB pagination with a computed field) isn't possible in SQL here,
  // so the whole filtered set is fetched, sorted, and paginated in memory —
  // fine at this table's current size (tens of rows), not built to scale past it.
  const clickCounts = await getClickCounts(listings.map((l) => l.id));
  const withClicks = listings.map((l) => ({ ...l, clickCount: clickCounts[l.id] ?? 0 }));

  const sortMul = dir === "asc" ? 1 : -1;
  const sorted = [...withClicks].sort((a, b) => {
    switch (sort) {
      case "title":
        return (a.title ?? a.display_url).localeCompare(b.title ?? b.display_url) * sortMul;
      case "amount":
        return (a.amount - b.amount) * sortMul;
      case "click_count":
        return (a.clickCount - b.clickCount) * sortMul;
      case "updated_at":
        return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * sortMul;
      case "created_at":
      default:
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * sortMul;
    }
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const from = (page - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(from, from + PAGE_SIZE);

  function baseParams() {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (categoryId) sp.set("category", categoryId);
    if (status !== "approved") sp.set("status", status);
    return sp;
  }

  function pageHref(targetPage: number) {
    const sp = baseParams();
    if (sort !== "created_at") sp.set("sort", sort);
    if (dir !== "desc") sp.set("dir", dir);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/panel-secure/listings?${qs}` : "/panel-secure/listings";
  }

  // Clicking a column header sorts by it (desc by default — newest/highest
  // first), or flips direction if it's already the active sort. Changing sort
  // resets back to page 1.
  function sortHref(key: SortKey) {
    const sp = baseParams();
    const nextDir = sort === key && dir === "desc" ? "asc" : "desc";
    if (key !== "created_at") sp.set("sort", key);
    if (nextDir !== "desc") sp.set("dir", nextDir);
    const qs = sp.toString();
    return qs ? `/panel-secure/listings?${qs}` : "/panel-secure/listings";
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sort !== column) return <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />;
    return dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Quản lý link</h1>

      <form method="GET" className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Tìm theo URL hoặc email..."
          className="h-9 w-56"
        />
        <select name="category" defaultValue={categoryId} className={nativeSelectClass}>
          <option value="">Tất cả category</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_vi}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className={nativeSelectClass}>
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

      {pageItems.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Không có listing nào khớp.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {SORT_COLUMNS.map((col) => (
                  <th key={col.key} className="py-2 pr-3 font-medium whitespace-nowrap">
                    <Link href={sortHref(col.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                      {col.label}
                      <SortIcon column={col.key} />
                    </Link>
                  </th>
                ))}
                <th className="py-2 pr-3 font-medium">Trạng thái</th>
                <th className="py-2 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((listing) => (
                <ListingRow key={listing.id} listing={listing} categories={categories ?? []} />
              ))}
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
