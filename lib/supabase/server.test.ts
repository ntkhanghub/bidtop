import { describe, expect, it } from "vitest";
import { supabase } from "@/lib/supabase/server";

describe("supabase server client", () => {
  it("constructs without throwing", () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe("function");
  });
});
