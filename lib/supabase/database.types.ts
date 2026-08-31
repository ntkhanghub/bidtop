export type ListingStatus =
  | "draft"
  | "pending_payment"
  | "paid_pending_review"
  | "approved"
  | "rejected"
  | "unpublished";
export type BidStatus = "pending" | "confirmed" | "failed";
export type AdminRole = "admin" | "super_admin";
export type PostStatus = "draft" | "published";
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// Hand-written to match supabase/migrations/*.sql (no Supabase CLI login available
// for `supabase gen types typescript` — see tech-spec.md Assumptions). `Views` is
// empty (we have none) and `Relationships` is empty on every table (no nested
// `.select()` embeds are used yet) — both are required by postgrest-js's
// `GenericSchema`/`GenericTable` shape even when unused, or type inference on
// `.from()`/`.select()` silently degrades to `never`.
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: { id: string; slug: string; name_vi: string; sort_order: number };
        Insert: { id?: string; slug: string; name_vi: string; sort_order: number };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          identity_key: string;
          display_url: string;
          category_id: string;
          status: ListingStatus;
          amount: number;
          first_confirmed_at: string | null;
          submitter_email: string | null;
          title: string | null;
          logo_url: string | null;
          description: string | null;
          rejection_reason: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          unpublished_by: string | null;
          unpublished_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          identity_key: string;
          display_url: string;
          category_id: string;
          status?: ListingStatus;
          amount?: number;
          first_confirmed_at?: string | null;
          submitter_email: string | null;
          title?: string | null;
          logo_url?: string | null;
          description?: string | null;
          rejection_reason?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          unpublished_by?: string | null;
          unpublished_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["listings"]["Insert"]>;
        Relationships: [];
      };
      bids: {
        Row: {
          id: string;
          listing_id: string;
          delta_amount: number;
          vat_amount: number;
          total_charged: number;
          gateway_order_id: string;
          gateway_txn_id: string | null;
          status: BidStatus;
          created_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          listing_id: string;
          delta_amount: number;
          vat_amount: number;
          total_charged: number;
          gateway_order_id: string;
          gateway_txn_id?: string | null;
          status?: BidStatus;
          confirmed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["bids"]["Insert"]>;
        Relationships: [];
      };
      settings: {
        Row: { key: string; value: string; updated_by: string | null; updated_at: string };
        Insert: { key: string; value: string; updated_by?: string | null };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
        Relationships: [];
      };
      admin_users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          role: AdminRole;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          role?: AdminRole;
          display_name?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["admin_users"]["Insert"]>;
        Relationships: [];
      };
      post_categories: {
        Row: { id: string; slug: string; name_vi: string; sort_order: number; created_at: string };
        Insert: { id?: string; slug: string; name_vi: string; sort_order?: number };
        Update: Partial<Database["public"]["Tables"]["post_categories"]["Insert"]>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          content: string;
          cover_image_url: string | null;
          category_id: string;
          author_id: string | null;
          status: PostStatus;
          published_at: string | null;
          meta_title: string | null;
          meta_description: string | null;
          is_pillar: boolean;
          pillar_post_id: string | null;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          content: string;
          cover_image_url?: string | null;
          category_id: string;
          author_id?: string | null;
          status?: PostStatus;
          published_at?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          is_pillar?: boolean;
          pillar_post_id?: string | null;
          data?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: [];
      };
      pages: {
        Row: {
          id: string;
          title: string;
          slug: string;
          content: string;
          status: PostStatus;
          meta_title: string | null;
          meta_description: string | null;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          content: string;
          status?: PostStatus;
          meta_title?: string | null;
          meta_description?: string | null;
          data?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["pages"]["Insert"]>;
        Relationships: [];
      };
      online_heartbeats: {
        Row: { session_id: string; last_seen: string };
        Insert: { session_id: string; last_seen?: string };
        Update: Partial<Database["public"]["Tables"]["online_heartbeats"]["Insert"]>;
        Relationships: [];
      };
      listing_clicks: {
        Row: { id: string; listing_id: string; created_at: string };
        Insert: { id?: string; listing_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["listing_clicks"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_listing_amount: {
        Args: { p_listing_id: string; p_delta: number };
        Returns: { amount: number; status: ListingStatus; first_confirmed_at: string | null }[];
      };
      confirm_bid_and_increment: {
        Args: { p_bid_id: string; p_gateway_txn_id: string };
        Returns: {
          amount: number;
          status: ListingStatus;
          first_confirmed_at: string | null;
          already_confirmed: boolean;
        }[];
      };
    };
  };
}
