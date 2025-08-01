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
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  default: "bg-gray-100 text-gray-800",
};

const customerStatusConfig: Record<
  CustomerStatus,
  { label: string; variant: StatusVariant }
> = {
  active: {
    label: "通常",
    variant: "default",
  },
  vip: {
    label: "VIP",
    variant: "warning",
  },
  blocked: {
    label: "ブロック",
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

  // デフォルト値を設定してエラーを防ぐ
  if (!config) {
    console.warn(`Unknown customer status: ${status}`);
    return <StatusBadge variant="default">Unknown</StatusBadge>;
  }

  return <StatusBadge variant={config.variant}>{config.label}</StatusBadge>;
}
