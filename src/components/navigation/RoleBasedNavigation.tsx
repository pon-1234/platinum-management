"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermission } from "@/hooks/usePermission";
import { useAuthStore } from "@/stores/auth.store";
import {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  CalendarIcon,
  CreditCardIcon,
  CubeIcon,
  ChartBarIcon,
  ClockIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  QrCodeIcon,
  TableCellsIcon,
  StarIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  resource?: string;
}

const navigationItems: NavigationItem[] = [
  { name: "ダッシュボード", href: "/dashboard", icon: HomeIcon },
  {
    name: "顧客管理",
    href: "/customers",
    icon: UsersIcon,
    resource: "customers",
  },
  {
    name: "スタッフ管理",
    href: "/staff",
    icon: UserGroupIcon,
    resource: "staff",
  },
  {
    name: "予約管理",
    href: "/bookings",
    icon: CalendarIcon,
    resource: "bookings",
  },
  {
    name: "会計管理",
    href: "/billing",
    icon: CreditCardIcon,
    resource: "billing",
  },
  {
    name: "勤怠管理",
    href: "/attendance",
    icon: ClockIcon,
    resource: "attendance",
  },
  {
    name: "QR勤怠",
    href: "/qr-attendance",
    icon: QrCodeIcon,
    resource: "attendance",
  },
  {
    name: "テーブル管理",
    href: "/tables",
    icon: TableCellsIcon,
    resource: "tables",
  },
  {
    name: "キャスト管理",
    href: "/cast/management",
    icon: StarIcon,
    resource: "cast",
  },
  {
    name: "コンプライアンス",
    href: "/compliance",
    icon: ShieldCheckIcon,
    resource: "compliance",
  },
  {
    name: "在庫管理",
    href: "/inventory",
    icon: CubeIcon,
    resource: "inventory",
  },
  {
    name: "レポート",
    href: "/reports",
    icon: ChartBarIcon,
    resource: "reports",
  },
  {
    name: "プロフィール",
    href: "/profile",
    icon: UserCircleIcon,
    resource: "profile",
  },
];

export function RoleBasedNavigation() {
  const pathname = usePathname();
  const { canAccessRoute } = usePermission();
  const { user, signOut } = useAuthStore();

  const filteredItems = navigationItems.filter((item) => {
    // Admin should see all items
    if (user?.role === "admin") {
      return true;
    }
    return canAccessRoute(item.href);
  });

  return (
    <nav className="flex flex-1 flex-col">
      <ul role="list" className="flex flex-1 flex-col gap-y-7">
        <li>
          <ul role="list" className="-mx-2 space-y-1">
            {filteredItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`
                      group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                      ${
                        isActive
                          ? "bg-gray-50 text-indigo-600"
                          : "text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                      }
                    `}
                    onClick={() => {
                      const sidebar = document.getElementById("sidebar");
                      const overlay = document.getElementById("overlay");
                      if (window.innerWidth < 1024) {
                        sidebar?.classList.add("-translate-x-full");
                        if (overlay) overlay.style.display = "none";
                      }
                    }}
                  >
                    <Icon
                      className={`
                        h-6 w-6 shrink-0
                        ${isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-indigo-600"}
                      `}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>

        {user && (
          <li className="mt-auto">
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-x-4 px-2 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getRoleDisplayName(user.role)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  signOut();
                  const sidebar = document.getElementById("sidebar");
                  const overlay = document.getElementById("overlay");
                  if (window.innerWidth < 1024) {
                    sidebar?.classList.add("-translate-x-full");
                    if (overlay) overlay.style.display = "none";
                  }
                }}
                className="group flex w-full gap-x-3 rounded-md px-2 py-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              >
                <ArrowRightOnRectangleIcon
                  className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-indigo-600"
                  aria-hidden="true"
                />
                ログアウト
              </button>
            </div>
          </li>
        )}
      </ul>
    </nav>
  );
}

function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    admin: "管理者",
    manager: "マネージャー",
    hall: "ホールスタッフ",
    cashier: "レジ担当",
    cast: "キャスト",
  };
  return roleNames[role] || role;
}
