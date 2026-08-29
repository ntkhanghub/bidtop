const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

// Vercel's serverless runtime defaults to UTC — `toLocaleString("vi-VN")`
// without an explicit timeZone silently renders wall-clock UTC (7h behind
// Hanoi time), not Vietnam local time. Every absolute-timestamp display must
// go through here, not a bare toLocaleString/toLocaleDateString call.
export function formatVnDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { timeZone: VN_TIME_ZONE });
}

export function formatVnDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: VN_TIME_ZONE });
}
