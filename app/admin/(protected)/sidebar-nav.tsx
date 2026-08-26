"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, List, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SidebarNav({ showSettings }: { showSettings: boolean }) {
  const pathname = usePathname();

  const items = [
    { href: "/admin", label: "Hàng chờ duyệt", icon: <ClipboardCheck className="size-[18px]" /> },
    { href: "/admin/listings", label: "Quản lý link", icon: <List className="size-[18px]" /> },
    ...(showSettings
      ? [
          {
            href: "/admin/settings",
            label: "Cài đặt",
            icon: <Settings className="size-[18px]" />,
            badge: "Super admin",
          },
        ]
      : []),
  ];

  return (
    <div>
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
          B
        </div>
        <span className="font-bold text-sidebar-foreground">BidTop Admin</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-3">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-2.5 rounded-md px-3 py-2 text-sm",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <span className="flex items-center gap-2.5">
                {item.icon}
                {item.label}
              </span>
              {"badge" in item && (
                <Badge variant="secondary" className="text-[10px] tracking-wide uppercase">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
