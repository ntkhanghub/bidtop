import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeListingIdentity } from "@/lib/normalize-identity";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({ identity: z.string().min(1) });

// Fast, DB-only lookup — tells the submit form the minimum price before the
// submitter commits to an amount. Never writes anything.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu URL/@handle." }, { status: 400 });
  }

  let identityKey: string;
  try {
    identityKey = normalizeListingIdentity(parsed.data.identity);
  } catch {
    return NextResponse.json({ error: "Không đọc được URL/@handle." }, { status: 400 });
  }

  const [{ data: settingsRows }, { data: existing }] = await Promise.all([
    supabase.from("settings").select("key, value").in("key", ["starting_price", "min_increment"]),
    supabase
      .from("listings")
      .select("amount, category_id")
      .eq("identity_key", identityKey)
      .maybeSingle(),
  ]);

  const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, Number(s.value)]));
  const startingPrice = settings.starting_price ?? 0;
  const minIncrement = settings.min_increment ?? 0;
  const isNew = !existing;
  const currentAmount = existing?.amount ?? 0;

  // An existing listing's category is fixed on this response, not left to the
  // client's own AI-classify guess — the submit form locks the field to it.
  let categorySlug: string | null = null;
  if (existing) {
    const { data: category } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", existing.category_id)
      .maybeSingle();
    categorySlug = category?.slug ?? null;
  }

  return NextResponse.json({
    identityKey,
    isNew,
    currentAmount,
    minimumRequired: isNew ? startingPrice : currentAmount + minIncrement,
    categorySlug,
  });
}
