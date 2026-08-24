import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CATEGORY_SLUGS } from "@/lib/categorize";
import { checkBannedPattern, resolveUrl } from "@/lib/content-validation";
import { normalizeListingIdentity } from "@/lib/normalize-identity";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({
  identity: z.string().min(1),
  amount: z.number().int().positive(),
  categorySlug: z.enum(CATEGORY_SLUGS),
  email: z.string().email(),
});

// Creates (or tops up) a draft listing + a pending bid. Never touches
// listings.amount directly — that field stays 0 (new) or unchanged (top-up)
// until the 9Pay webhook confirms payment in Sprint 3 and calls
// increment_listing_amount(). See CLAUDE.md Safety rules.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const { identity, amount, categorySlug, email } = parsed.data;

  let identityKey: string;
  try {
    identityKey = normalizeListingIdentity(identity);
  } catch {
    return NextResponse.json({ error: "Không đọc được URL/@handle." }, { status: 400 });
  }

  const trimmed = identity.trim();
  let displayUrl: string;
  if (trimmed.startsWith("@")) {
    displayUrl = `https://x.com/${trimmed.slice(1)}`;
  } else {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const resolved = await resolveUrl(withProtocol);
    const check = checkBannedPattern(resolved);
    if (!check.ok) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }
    displayUrl = resolved;
  }

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();
  if (!category) {
    return NextResponse.json({ error: "Category không hợp lệ." }, { status: 400 });
  }

  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["starting_price", "min_increment", "vat_percent"]);
  const settings = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, Number(s.value)]));

  const { data: existing } = await supabase
    .from("listings")
    .select("id, amount, submitter_email")
    .eq("identity_key", identityKey)
    .maybeSingle();

  let listingId: string;
  let deltaAmount: number;

  if (existing) {
    if (existing.submitter_email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "Domain/handle này đã được đăng ký với email khác." },
        { status: 409 },
      );
    }
    const minimum = existing.amount + settings.min_increment;
    if (amount < minimum) {
      return NextResponse.json(
        { error: `Số tiền tối thiểu là ${minimum.toLocaleString("vi-VN")}đ.` },
        { status: 400 },
      );
    }
    listingId = existing.id;
    deltaAmount = amount - existing.amount;
  } else {
    if (amount < settings.starting_price) {
      return NextResponse.json(
        { error: `Số tiền tối thiểu là ${settings.starting_price.toLocaleString("vi-VN")}đ.` },
        { status: 400 },
      );
    }
    const { data: created, error } = await supabase
      .from("listings")
      .insert({
        identity_key: identityKey,
        display_url: displayUrl,
        category_id: category.id,
        submitter_email: email,
        status: "pending_payment",
      })
      .select("id")
      .single();
    if (error || !created) {
      if (error?.code === "23505") {
        return NextResponse.json(
          { error: "Domain/handle này vừa được đăng ký, thử lại." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "Không tạo được listing." }, { status: 500 });
    }
    listingId = created.id;
    deltaAmount = amount;
  }

  const vatAmount = Math.round((deltaAmount * settings.vat_percent) / 100);

  const { data: bid, error: bidError } = await supabase
    .from("bids")
    .insert({
      listing_id: listingId,
      delta_amount: deltaAmount,
      vat_amount: vatAmount,
      total_charged: deltaAmount + vatAmount,
      // Real 9Pay order id lands in Sprint 3 — this is a stub so the row can
      // exist before checkout integration is built.
      gateway_order_id: `pending-${randomUUID()}`,
      status: "pending",
    })
    .select("id")
    .single();

  if (bidError || !bid) {
    return NextResponse.json({ error: "Không tạo được bid." }, { status: 500 });
  }

  return NextResponse.json({ listingId, bidId: bid.id });
}
