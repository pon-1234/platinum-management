import { CustomerStatus } from "@/types/customer.types";

type StatusVariant = "success" | "warning" | "error" | "info" | "default";

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: StatusVariant;
  className?: string;
}

interface CustomerStatusBadgeProps {
  status: CustomerStatus;
}

const variantConfig: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  warning:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  default: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const customerStatusConfig: Record<
  CustomerStatus,
  { label: string; variant: StatusVariant }
> = {
  normal: {
    label: "通常",
    variant: "default",
  },
  vip: {
    label: "VIP",
    variant: "warning",
  },
  caution: {
    label: "要注意",
    variant: "warning",
  },
  blacklisted: {
    label: "ブラックリスト",
    variant: "error",
  },
};

// Generic StatusBadge component
export function StatusBadge({
  children,
  variant = "default",
  className = "",
}: StatusBadgeProps) {
  const variantClass = variantConfig[variant];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClass} ${className}`}
    >
      {children}
    </span>
  );
}

// Specific CustomerStatusBadge component
export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  const config = customerStatusConfig[status];

  return <StatusBadge variant={config.variant}>{config.label}</StatusBadge>;
}
