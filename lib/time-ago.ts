export function timeAgoVi(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(diffMs / 3_600_000);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(diffMs / 86_400_000);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  const months = Math.round(diffMs / (86_400_000 * 30));
  if (Math.abs(months) < 12) return rtf.format(months, "month");
  return rtf.format(Math.round(diffMs / (86_400_000 * 365)), "year");
}
