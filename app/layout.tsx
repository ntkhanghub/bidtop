import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "BidTop.vn",
  description: "Bảng xếp hạng công khai — thứ hạng là số tiền đã trả.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-white">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
