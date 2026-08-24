"use client";

import { useRouter } from "next/navigation";
import type { AdminRole } from "@/lib/supabase/database.types";

export function AccountMenu({ email, role }: { email: string; role: AdminRole }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="border-t border-neutral-200 p-3">
      <div className="flex items-center gap-2.5 rounded-md p-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
          {email[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-neutral-900">{email}</div>
          <div className="text-xs text-neutral-500">{role}</div>
        </div>
        <button
          onClick={handleLogout}
          title="Đăng xuất"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H4.5C3.67 3 3 3.67 3 4.5V15.5C3 16.33 3.67 17 4.5 17H8" />
            <path d="M13 13.5L17 10L13 6.5" />
            <line x1="17" y1="10" x2="7.5" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
