type ActivityItem = { id: string; displayUrl: string; deltaAmount: number };

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-sm font-semibold text-neutral-900">Hoạt động gần đây</h2>
      <ul className="mt-2 flex flex-col gap-1 text-sm text-neutral-500">
        {items.map((item) => (
          <li key={item.id}>
            {item.displayUrl} <span className="text-neutral-900">+{item.deltaAmount.toLocaleString("vi-VN")}đ</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
