import { supabase } from "@/lib/supabase/server";
import { QueueRow } from "./queue-row";

export default async function AdminHomePage() {
  const [{ data: listings }, { data: categories }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, display_url, category_id, submitter_email, amount")
      .eq("status", "paid_pending_review")
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("id, slug, name_vi").order("sort_order"),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900">Hàng chờ duyệt</h1>
      {!listings || listings.length === 0 ? (
        <p className="mt-4 text-neutral-500">Không có listing nào đang chờ duyệt.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {listings.map((listing) => (
            <QueueRow key={listing.id} listing={listing} categories={categories ?? []} />
          ))}
        </ul>
      )}
    </div>
  );
}
