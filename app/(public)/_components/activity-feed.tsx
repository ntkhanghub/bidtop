import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { timeAgoVi } from "@/lib/time-ago";

type ActivityItem = {
  id: string;
  displayUrl: string;
  title: string | null;
  logoUrl: string | null;
  deltaAmount: number;
  rank: number;
  confirmedAt: string;
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="my-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="size-2 rounded-full bg-live" />
        <h2 className="text-sm font-semibold text-foreground">Hoạt động gần đây</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-3">
            <Avatar size="sm">
              {item.logoUrl && <AvatarImage src={item.logoUrl} alt="" />}
              <AvatarFallback>{(item.title ?? item.displayUrl).charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="mt-2 truncate text-sm font-medium text-foreground">
              {item.title ?? item.displayUrl}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              tại #{item.rank} ·{" "}
              <span className="font-mono tabular-nums">
                {item.deltaAmount.toLocaleString("vi-VN")}đ
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{timeAgoVi(item.confirmedAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
