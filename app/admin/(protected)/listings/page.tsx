import Link from "next/link";
import { supabase } from "@/lib/supabase/server";
import type { ListingStatus } from "@/lib/supabase/database.types";
import { ListingRow } from "./listing-row";

const PAGE_SIZE = 20;
const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Đã từ chối" },
  { value: "unpublished", label: "Đã gỡ" },
];

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const categoryId = params.category ?? "";
  const status: ListingStatus = STATUS_OPTIONS.some((s) => s.value === params.status)
    ? (params.status as ListingStatus)
    : "approved";
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("listings")
    .select(
      "id, display_url, identity_key, category_id, submitter_email, amount, status, rejection_reason, unpublished_at, created_at",
      { count: "exact" },
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (categoryId) query = query.eq("category_id", categoryId);
  if (q) {
    const escaped = q.replace(/,/g, "");
    query = query.or(
      `display_url.ilike.%${escaped}%,identity_key.ilike.%${escaped}%,submitter_email.ilike.%${escaped}%`,
    );
  }

  const [{ data: listings, count }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("id, slug, name_vi").order("sort_order"),
  ]);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (categoryId) sp.set("category", categoryId);
    if (status !== "approved") sp.set("status", status);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/admin/listings?${qs}` : "/admin/listings";
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900">Quản lý link</h1>

      <form method="GET" className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Tìm theo URL hoặc email..."
          className="rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <select name="category" defaultValue={categoryId} className="rounded border border-neutral-300 px-2 py-2 text-sm">
          <option value="">Tất cả category</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_vi}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="rounded border border-neutral-300 px-2 py-2 text-sm">
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
          Lọc
        </button>
      </form>

      {!listings || listings.length === 0 ? (
        <p className="mt-4 text-neutral-500">Không có listing nào khớp.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {listings.map((listing) => (
            <ListingRow key={listing.id} listing={listing} categories={categories ?? []} />
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="text-neutral-500 hover:text-neutral-900">
              ← Trước
            </Link>
          )}
          <span className="text-neutral-500">
            Trang {page}/{totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="text-neutral-500 hover:text-neutral-900">
              Sau →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
