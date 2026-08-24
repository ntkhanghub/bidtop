"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function QueueIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="12" height="14" rx="1.5" />
      <path d="M7.5 3V2.5C7.5 2 8 1.5 8.5 1.5H11.5C12 1.5 12.5 2 12.5 2.5V3" />
      <path d="M7 10.3L9 12.3L13 7.8" />
    </svg>
  );
}

function ListingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6.5L10.3 5.2C11.5 4 13.4 4 14.6 5.2C15.8 6.4 15.8 8.3 14.6 9.5L13.3 10.8" />
      <path d="M11 13.5L9.7 14.8C8.5 16 6.6 16 5.4 14.8C4.2 13.6 4.2 11.7 5.4 10.5L6.7 9.2" />
      <path d="M8.5 11.5L11.5 8.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="17" y2="6" />
      <circle cx="12" cy="6" r="1.6" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <circle cx="7" cy="10" r="1.6" />
      <line x1="3" y1="14" x2="17" y2="14" />
      <circle cx="14" cy="14" r="1.6" />
    </svg>
  );
}

export function SidebarNav({ showSettings }: { showSettings: boolean }) {
  const pathname = usePathname();

  const items = [
    { href: "/admin", label: "Hàng chờ duyệt", icon: <QueueIcon /> },
    { href: "/admin/listings", label: "Quản lý link", icon: <ListingsIcon /> },
    ...(showSettings
      ? [{ href: "/admin/settings", label: "Cài đặt", icon: <SettingsIcon />, badge: "Super admin" }]
      : []),
  ];

  return (
    <div>
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-sm font-bold text-white">
          B
        </div>
        <span className="font-bold text-neutral-900">BidTop Admin</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-3">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-2.5 rounded-md px-3 py-2 text-sm ${
                active ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <span className="flex items-center gap-2.5">
                {item.icon}
                {item.label}
              </span>
              {"badge" in item && (
                <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
