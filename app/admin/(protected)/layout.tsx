import { requireAdminPage } from "@/lib/auth/require-admin";
import { AccountMenu } from "./account-menu";
import { SidebarNav } from "./sidebar-nav";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();

  return (
    <div className="flex h-screen">
      <div className="flex w-64 shrink-0 flex-col justify-between border-r border-neutral-200">
        <SidebarNav showSettings={session.role === "super_admin"} />
        <AccountMenu email={session.email} role={session.role} />
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
