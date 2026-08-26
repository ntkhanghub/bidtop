import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { OnlineCounter } from "./_components/online-counter";

const NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/categories", label: "Danh mục" },
  { href: "/rules", label: "Luật chơi" },
  { href: "/about", label: "Giới thiệu" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-primary">
            BidTop.vn
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Button key={link.href} asChild variant="ghost" size="sm">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
            <Button asChild size="sm" className="ml-2">
              <Link href="/submit">Đăng listing</Link>
            </Button>
            <div className="ml-2">
              <ThemeToggle />
            </div>
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
