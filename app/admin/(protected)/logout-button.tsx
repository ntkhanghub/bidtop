"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className="text-sm text-neutral-500 hover:text-neutral-900">
      Đăng xuất
    </button>
  );
}
