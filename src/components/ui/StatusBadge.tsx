import { CustomerStatus } from "@/types/customer.types";

interface StatusBadgeProps {
  status: CustomerStatus;
}

const statusConfig: Record<
  CustomerStatus,
  { label: string; className: string }
> = {
  normal: {
    label: "通常",
    className: "bg-gray-100 text-gray-800",
  },
  vip: {
    label: "VIP",
    className: "bg-yellow-100 text-yellow-800",
  },
  caution: {
    label: "要注意",
    className: "bg-orange-100 text-orange-800",
  },
  blacklisted: {
    label: "ブラックリスト",
    className: "bg-red-100 text-red-800",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
