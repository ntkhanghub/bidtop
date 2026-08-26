"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { AdminRole } from "@/lib/supabase/database.types";

export function AccountMenu({ email, role }: { email: string; role: AdminRole }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-2.5 rounded-md p-2">
        <Avatar>
          <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
            {email[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-sidebar-foreground">{email}</div>
          <div className="text-xs text-muted-foreground">{role}</div>
        </div>
        <Button
          onClick={handleLogout}
          title="Đăng xuất"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-sidebar-accent-foreground"
        >
          <LogOut />
        </Button>
      </div>
    </div>
  );
}
