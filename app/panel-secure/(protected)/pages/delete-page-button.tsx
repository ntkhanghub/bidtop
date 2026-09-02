"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeletePageButton({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Xoá trang này?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/pages/${pageId}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error ?? "Không xoá được trang.");
      return;
    }
    toast.success("Đã xoá trang");
    router.refresh();
  }

  return (
    <Button
      onClick={handleDelete}
      disabled={busy}
      variant="ghost"
      size="sm"
      className="h-auto p-0 text-destructive hover:bg-transparent hover:text-destructive hover:underline"
    >
      Xoá
    </Button>
  );
}
