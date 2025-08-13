import { UserRole } from "@/types/auth.types";

interface RoleBadgeProps {
  role: UserRole;
}

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  admin: {
    label: "管理者",
    className: "bg-purple-100 text-purple-800",
  },
  manager: {
    label: "マネージャー",
    className: "bg-blue-100 text-blue-800",
  },
  hall: {
    label: "ホールスタッフ",
    className: "bg-green-100 text-green-800",
  },
  cashier: {
    label: "会計担当",
    className: "bg-yellow-100 text-yellow-800",
  },
  cast: {
    label: "キャスト",
    className: "bg-pink-100 text-pink-800",
  },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
