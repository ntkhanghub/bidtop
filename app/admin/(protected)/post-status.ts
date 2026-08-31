import type { PostStatus } from "@/lib/supabase/database.types";

// Shared between the posts/pages list pages and their edit forms.
export const POST_STATUS_BADGE: Record<PostStatus, { label: string; className: string }> = {
  published: { label: "Đã đăng", className: "bg-live/15 text-live" },
  draft: { label: "Nháp", className: "bg-muted text-muted-foreground" },
};
