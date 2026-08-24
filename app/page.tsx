import { supabase } from "@/lib/supabase/server";

// Cached, revalidated every 30s rather than fully static or fully dynamic —
// matches the tech-spec's read-heavy NFR (leaderboard renders < 1s on the cached
// path) while still reflecting new/topped-up listings within a bounded delay.
export const revalidate = 30;

// Walking skeleton (S1-T6). Real pagination, favicon, and "claim this rank"
// pricing (F1, S5-T1/S5-T2) land in Sprint 5 — this just proves the read path.
export default async function Home() {
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, display_url, amount")
    .eq("status", "approved")
    .order("amount", { ascending: false })
    .order("first_confirmed_at", { ascending: true });

  if (error) throw error;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">BidTop.vn</h1>
      {listings.length === 0 ? (
        <p className="mt-4 text-neutral-500">
          Chưa có listing nào được duyệt. Rank là số tiền đã trả — không gì khác.
        </p>
      ) : (
        <ol className="mt-4 divide-y divide-neutral-200">
          {listings.map((listing, index) => (
            <li key={listing.id} className="flex items-center justify-between py-3">
              <span className="text-neutral-900">
                #{index + 1} — {listing.display_url}
              </span>
              <span className="text-neutral-500">
                {listing.amount.toLocaleString("vi-VN")}đ
              </span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
