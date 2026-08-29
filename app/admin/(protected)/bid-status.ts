import type { BidStatus } from "@/lib/supabase/database.types";

// Shared between the per-listing bid history (listings/[id]/page.tsx) and the
// global bid history page (bids/page.tsx).
export const BID_STATUS_BADGE: Record<BidStatus, { label: string; className: string }> = {
  confirmed: { label: "Đã xác nhận", className: "bg-live/15 text-live" },
  pending: { label: "Chờ xử lý", className: "bg-muted text-muted-foreground" },
  failed: { label: "Thất bại", className: "bg-destructive/15 text-destructive" },
};
