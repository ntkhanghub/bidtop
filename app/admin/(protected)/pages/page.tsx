import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { formatVnDateTime } from "@/lib/format-vn-datetime";
import { supabase } from "@/lib/supabase/server";
import { POST_STATUS_BADGE } from "../post-status";
import { DeletePageButton } from "./delete-page-button";

export default async function AdminPagesPage() {
  await requireAdminPage("admin");

  const { data: pages } = await supabase
    .from("pages")
    .select("id, title, slug, status, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Trang tĩnh</h1>
        <Button asChild size="sm">
          <Link href="/admin/pages/new">Tạo trang</Link>
        </Button>
      </div>

      {!pages || pages.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Chưa có trang nào.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1.5 font-medium">Tiêu đề</th>
                <th className="py-1.5 font-medium">Slug</th>
                <th className="py-1.5 font-medium">Trạng thái</th>
                <th className="py-1.5 font-medium">Cập nhật</th>
                <th className="py-1.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const badge = POST_STATUS_BADGE[page.status];
                return (
                  <tr key={page.id} className="border-b border-border/50">
                    <td className="max-w-64 truncate py-1.5">{page.title}</td>
                    <td className="py-1.5 font-mono text-xs text-muted-foreground">/{page.slug}</td>
                    <td className="py-1.5">
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </td>
                    <td className="py-1.5 whitespace-nowrap">{formatVnDateTime(page.updated_at)}</td>
                    <td className="py-1.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/pages/${page.id}`} className="text-sm hover:underline">
                          Sửa
                        </Link>
                        <DeletePageButton pageId={page.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
