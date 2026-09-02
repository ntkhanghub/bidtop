import type { ListingStatus } from "@/lib/supabase/database.types";

// Shared between the listings list (listing-row.tsx) and the edit page
// (listings/[id]/edit-form.tsx), which both render the same status badge.
export const STATUS_BADGE: Record<ListingStatus, { label: string; className: string }> = {
  approved: { label: "Đã duyệt", className: "bg-live/15 text-live" },
  rejected: { label: "Đã từ chối", className: "bg-destructive/15 text-destructive" },
  unpublished: { label: "Đã gỡ", className: "bg-muted text-muted-foreground" },
  paid_pending_review: { label: "Chờ duyệt", className: "bg-accent/20 text-accent-foreground" },
  draft: { label: "Nháp", className: "bg-muted text-muted-foreground" },
  pending_payment: { label: "Chờ thanh toán", className: "bg-muted text-muted-foreground" },
};
