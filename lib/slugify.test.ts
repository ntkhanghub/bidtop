import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("strips Vietnamese diacritics and lowercases", () => {
    expect(slugify("Chiến lược SEO 2026")).toBe("chien-luoc-seo-2026");
  });

  it("handles đ/Đ explicitly (NFD doesn't decompose it)", () => {
    expect(slugify("Đầu tư Đúng cách")).toBe("dau-tu-dung-cach");
  });

  it("collapses non-alphanumeric runs into single hyphens", () => {
    expect(slugify("Hướng dẫn: Nâng Hạng!!")).toBe("huong-dan-nang-hang");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  -- SEO --  ")).toBe("seo");
  });
});
