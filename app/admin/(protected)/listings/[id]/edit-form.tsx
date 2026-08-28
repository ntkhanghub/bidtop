"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Listing = {
  id: string;
  title: string | null;
  logo_url: string | null;
  description: string | null;
  display_url: string;
  category_id: string;
};
type Category = { id: string; slug: string; name_vi: string };

export function EditForm({ listing, categories }: { listing: Listing; categories: Category[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(listing.title ?? "");
  const [logoUrl, setLogoUrl] = useState(listing.logo_url ?? "");
  const [description, setDescription] = useState(listing.description ?? "");
  const [displayUrl, setDisplayUrl] = useState(listing.display_url);
  const [categoryId, setCategoryId] = useState(listing.category_id);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/admin/listings/${listing.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, logoUrl, description, displayUrl, categoryId }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(data.error ?? "Không lưu được listing.");
      return;
    }
    toast.success("Đã lưu listing");
    router.push("/admin/listings");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex max-w-lg flex-col gap-4">
      <div>
        <Label htmlFor="title">Tiêu đề</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
      </div>

      <div>
        <Label htmlFor="logoUrl">Logo URL</Label>
        <Input
          id="logoUrl"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          className="mt-1"
        />
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="mt-2 size-10 rounded-md border border-border object-contain"
            onError={(e) => (e.currentTarget.style.visibility = "hidden")}
          />
        )}
      </div>

      <div>
        <Label htmlFor="description">Mô tả</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1"
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="displayUrl">Đường dẫn (URL)</Label>
        <Input
          id="displayUrl"
          value={displayUrl}
          onChange={(e) => setDisplayUrl(e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="category">Danh mục</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="category" className="mt-1 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name_vi}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/admin/listings">Huỷ</Link>
        </Button>
      </div>
    </form>
  );
}
