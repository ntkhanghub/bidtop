import Link from "next/link";
import { OnlineCounter } from "./_components/online-counter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-neutral-900">
            BidTop.vn
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-500">
            <Link href="/" className="hover:text-neutral-900">
              Trang chủ
            </Link>
            <Link href="/categories" className="hover:text-neutral-900">
              Danh mục
            </Link>
            <Link href="/rules" className="hover:text-neutral-900">
              Luật chơi
            </Link>
            <Link href="/about" className="hover:text-neutral-900">
              Giới thiệu
            </Link>
            <Link
              href="/submit"
              className="rounded bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-700"
            >
              Đăng listing
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-neutral-200 py-4 text-center text-sm text-neutral-500">
        <OnlineCounter />
      </footer>
    </div>
  );
}
