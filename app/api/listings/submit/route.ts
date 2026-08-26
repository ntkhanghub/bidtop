import { NextResponse } from "next/server";
import { z } from "zod";
import { CATEGORY_SLUGS } from "@/lib/categorize";
import { checkBannedPattern, resolveUrl } from "@/lib/content-validation";
import { notifyNewSubmission } from "@/lib/email/notify";
import { normalizeListingIdentity } from "@/lib/normalize-identity";
import { buildGatewayOrderId } from "@/lib/payment/order-id";
import { supabase } from "@/lib/supabase/server";

const bodySchema = z.object({
  identity: z.string().min(1),
  amount: z.number().int().positive(),
  categorySlug: z.enum(CATEGORY_SLUGS),
  email: z.string().email(),
});

// TEST-ONLY: bypasses the minimum-amount checks below when submitting under
// the founder's own email, so real-payment testing (SePay has no
// sandbox-safe substitute for a real production charge) costs as little as
// possible. Never bypasses payment itself — the amount still goes through
// the real gateway and still only ranks up via the verified webhook. Remove
// before real launch — see PROGRESS.md Blockers.
const TEST_BYPASS_EMAIL = "ntkhang@gmail.com";

// Creates (or tops up) a draft listing + a pending bid. Never touches
// listings.amount directly — that field stays 0 (new) or unchanged (top-up)
// until the active gateway's IPN webhook (currently app/api/webhooks/sepay —
// ZaloPay's is paused, see PROGRESS.md Decisions) confirms payment. See
// CLAUDE.md Safety rules.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const { identity, amount, categorySlug, email } = parsed.data;
  const isTestBypass = email.toLowerCase() === TEST_BYPASS_EMAIL;

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
  let isNewListing = false;

  if (existing) {
    if (existing.submitter_email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "Domain/handle này đã được đăng ký với email khác." },
        { status: 409 },
      );
    }
    const minimum = existing.amount + settings.min_increment;
    if (!isTestBypass && amount < minimum) {
      return NextResponse.json(
        { error: `Số tiền tối thiểu là ${minimum.toLocaleString("vi-VN")}đ.` },
        { status: 400 },
      );
    }
    listingId = existing.id;
    deltaAmount = amount - existing.amount;
  } else {
    if (!isTestBypass && amount < settings.starting_price) {
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
    isNewListing = true;
  }

  const vatAmount = Math.round((deltaAmount * settings.vat_percent) / 100);

  const { data: bid, error: bidError } = await supabase
    .from("bids")
    .insert({
      listing_id: listingId,
      delta_amount: deltaAmount,
      vat_amount: vatAmount,
      total_charged: deltaAmount + vatAmount,
      // Gateway-agnostic order id (yymmdd_xxxx, unique/day) — set once here,
      // reused as-is by the checkout-session and webhook routes so a
      // retried checkout request never mints a second gateway order for the
      // same bid.
      gateway_order_id: buildGatewayOrderId(),
      status: "pending",
    })
    .select("id")
    .single();

  if (bidError || !bid) {
    return NextResponse.json({ error: "Không tạo được bid." }, { status: 500 });
  }

  if (isNewListing) {
    try {
      await notifyNewSubmission({ displayUrl, submitterEmail: email });
    } catch (err) {
      console.error("notifyNewSubmission failed:", err);
    }
  }

  return NextResponse.json({ listingId, bidId: bid.id });
}
