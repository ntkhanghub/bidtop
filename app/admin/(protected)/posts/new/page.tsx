import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { supabase } from "@/lib/supabase/server";
import { PostForm } from "../post-form";

export default async function NewPostPage() {
  await requireAdminPage("admin");

  const [{ data: categories }, { data: pillarPosts }] = await Promise.all([
    supabase.from("post_categories").select("id, slug, name_vi").order("sort_order"),
    supabase.from("posts").select("id, title").eq("is_pillar", true).order("title"),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Tạo bài viết</h1>
      {!categories || categories.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          Cần tạo ít nhất một{" "}
          <Link href="/admin/post-categories/new" className="text-accent hover:underline">
            danh mục blog
          </Link>{" "}
          trước khi tạo bài viết — mọi bài viết đều phải thuộc một danh mục.
        </p>
      ) : (
        <PostForm categories={categories} pillarOptions={pillarPosts ?? []} />
      )}
    </div>
  );
}
