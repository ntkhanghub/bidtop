import { supabase } from "@/lib/supabase/server";

// One exact/head count query per listing, run in parallel — same pattern
// already used for per-category counts on /categories (see tech-spec.md).
export async function getClickCounts(listingIds: string[]): Promise<Record<string, number>> {
  const counts = await Promise.all(
    listingIds.map((id) =>
      supabase.from("listing_clicks").select("id", { count: "exact", head: true }).eq("listing_id", id),
    ),
  );
  return Object.fromEntries(listingIds.map((id, i) => [id, counts[i].count ?? 0]));
}
