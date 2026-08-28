import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/server";
import { timeAgoVi } from "@/lib/time-ago";
import { CopyLinkButton } from "./_components/copy-link-button";

export const revalidate = 30;

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const [{ data: listing }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, display_url, category_id, amount, first_confirmed_at, title, logo_url, description",
      )
      .eq("status", "approved")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("settings").select("value").eq("key", "min_increment").maybeSingle(),
  ]);
  if (!listing) notFound();

  // Always set once a listing reaches "approved" — confirm_bid_and_increment()
  // sets it before a listing can leave paid_pending_review.
  const firstConfirmedAt = listing.first_confirmed_at as string;
  const minIncrement = Number(settingsRows?.value ?? 50000);
  const claimAmount = listing.amount + minIncrement;

  const [
    { data: category },
    { count: categoryGreater },
    { count: categoryTie },
    { count: categoryTotal },
    { count: overallGreater },
    { count: overallTie },
    { count: overallTotal },
  ] = await Promise.all([
    supabase.from("categories").select("name_vi, slug").eq("id", listing.category_id).single(),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("category_id", listing.category_id)
      .gt("amount", listing.amount),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("category_id", listing.category_id)
      .eq("amount", listing.amount)
      .lt("first_confirmed_at", firstConfirmedAt),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("category_id", listing.category_id),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .gt("amount", listing.amount),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("amount", listing.amount)
      .lt("first_confirmed_at", firstConfirmedAt),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "approved"),
  ]);

  const categoryRank = (categoryGreater ?? 0) + (categoryTie ?? 0) + 1;
  const overallRank = (overallGreater ?? 0) + (overallTie ?? 0) + 1;

  return (
    <main className="mx-auto max-w-[900px] px-4 py-12">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">
          Bảng xếp hạng
        </Link>
        {category && (
          <>
            {" · "}
            <Link href={`/category/${category.slug}`} className="hover:underline">
              {category.name_vi}
            </Link>
          </>
        )}
      </p>

      <div className="mt-4 flex items-center gap-4">
        <Avatar size="lg">
          {listing.logo_url && <AvatarImage src={listing.logo_url} alt="" />}
          <AvatarFallback>
            {listing.display_url.replace(/^https?:\/\//, "").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-bold text-foreground">
          {listing.display_url}
          {listing.title && (
            <span className="font-normal text-muted-foreground"> · {listing.title}</span>
          )}
        </h1>
      </div>

      {listing.description && <p className="mt-4 text-muted-foreground">{listing.description}</p>}

      <p className="mt-2 text-sm text-muted-foreground">
        {category?.name_vi}
        {" · "}
        {timeAgoVi(firstConfirmedAt)}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Card className="gap-1 p-4">
          <CardDescription>Đã trả</CardDescription>
          <CardTitle className="font-mono text-xl tabular-nums">
            {listing.amount.toLocaleString("vi-VN")}đ
          </CardTitle>
        </Card>
        <Card className="gap-1 p-4">
          <CardDescription>Hạng trong danh mục</CardDescription>
          <CardTitle className="text-xl">
            #{categoryRank}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              /{categoryTotal ?? 0}
            </span>
          </CardTitle>
        </Card>
        <Card className="gap-1 p-4">
          <CardDescription>Hạng tổng</CardDescription>
          <CardTitle className="text-xl">
            #{overallRank}
            <span className="text-sm font-normal text-muted-foreground"> /{overallTotal ?? 0}</span>
          </CardTitle>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild>
          <a href={`/out/${listing.id}`}>Truy cập {listing.display_url}</a>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/submit?amount=${claimAmount}`}>
            Giành hạng này với {claimAmount.toLocaleString("vi-VN")}đ
          </Link>
        </Button>
        <CopyLinkButton />
      </div>
    </main>
  );
}
