import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";
import { PostForm } from "../post-form";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("admin");
  const { id } = await params;

  const [{ data: post }, { data: categories }, { data: pillarPosts }] = await Promise.all([
    supabase
      .from("posts")
      .select(
        "id, title, slug, excerpt, content, cover_image_url, category_id, status, published_at, meta_title, meta_description, is_pillar, pillar_post_id, data",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("post_categories").select("id, slug, name_vi").order("sort_order"),
    supabase.from("posts").select("id, title").eq("is_pillar", true).order("title"),
  ]);
  if (!post) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Chỉnh sửa bài viết</h1>
      <PostForm post={post} categories={categories ?? []} pillarOptions={pillarPosts ?? []} />
    </div>
  );
}
