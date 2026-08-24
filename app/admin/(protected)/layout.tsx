import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { LogoutButton } from "./logout-button";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();

  return (
    <div>
      <nav className="border-b border-neutral-200 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-bold text-neutral-900">
              BidTop Admin
            </Link>
            <Link href="/admin" className="text-sm text-neutral-500 hover:text-neutral-900">
              Hàng chờ duyệt
            </Link>
            {session.role === "super_admin" && (
              <Link href="/admin/settings" className="text-sm text-neutral-500 hover:text-neutral-900">
                Cài đặt
              </Link>
            )}
          </div>
          <LogoutButton />
        </div>
      </nav>
      <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
    </div>
  );
}
