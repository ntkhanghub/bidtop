// Vietnamese-aware slug suggestion for the blog/CMS admin forms. NFD normalization
// strips most diacritics, but "đ/Đ" doesn't decompose that way — handled explicitly.
const COMBINING_MARKS = new RegExp("[̀-ͯ]", "g");

export function slugify(input: string): string {
  return input
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
