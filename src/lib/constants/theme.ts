export const STATUS_COLORS = {
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  neutral: "bg-gray-100 text-gray-800",
} as const;

export const TABLE_STATUS_COLORS = {
  available: "bg-green-100 text-green-800",
  occupied: "bg-blue-100 text-blue-800",
  reserved: "bg-yellow-100 text-yellow-800",
  cleaning: "bg-gray-100 text-gray-800",
} as const;

export const ATTENDANCE_STATUS_COLORS = {
  present: "bg-green-100 text-green-800",
  late: "bg-yellow-100 text-yellow-800",
  absent: "bg-red-100 text-red-800",
  off: "bg-gray-100 text-gray-800",
} as const;

export function getStatusColor(
  status: string,
  type: "default" | "table" | "attendance" = "default"
): string {
  switch (type) {
    case "table":
      return (
        TABLE_STATUS_COLORS[status as keyof typeof TABLE_STATUS_COLORS] ||
        STATUS_COLORS.neutral
      );
    case "attendance":
      return (
        ATTENDANCE_STATUS_COLORS[
          status as keyof typeof ATTENDANCE_STATUS_COLORS
        ] || STATUS_COLORS.neutral
      );
    default:
      return (
        STATUS_COLORS[status as keyof typeof STATUS_COLORS] ||
        STATUS_COLORS.neutral
      );
  }
}
