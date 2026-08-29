import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";
import { OnlineCounter } from "./_components/online-counter";

const NAV_LINKS = [
  { href: "/", label: "Trang chủ", hideOnMobile: true },
  { href: "/categories", label: "Danh mục" },
  { href: "/rules", label: "Luật chơi" },
  { href: "/about", label: "Giới thiệu" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-center justify-between gap-y-1 px-3 py-3 sm:px-4 sm:py-4">
          <Link href="/" className="text-sm font-bold text-primary sm:text-lg">
            {SITE_NAME}
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-1">
            {NAV_LINKS.map((link) => (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "px-1.5 text-[11px] sm:px-3 sm:text-sm",
                  link.hideOnMobile && "hidden sm:inline-flex",
                )}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
            <Button asChild size="sm" className="px-1.5 text-[11px] sm:px-3 sm:text-sm">
              <Link href="/submit">
                <span className="sm:hidden">Đăng</span>
                <span className="hidden sm:inline">Đăng listing</span>
              </Link>
            </Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-border py-4 text-center text-sm">
        <OnlineCounter />
      </footer>
    </div>
  );
}
