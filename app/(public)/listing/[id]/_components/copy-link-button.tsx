"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyLinkButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast.success("Đã sao chép liên kết");
        } catch {
          toast.error("Không sao chép được liên kết.");
        }
      }}
    >
      <Copy /> Sao chép liên kết
    </Button>
  );
}
