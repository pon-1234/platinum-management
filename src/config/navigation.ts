import type { ComponentType } from "react";
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
  QrCodeIcon,
  TableCellsIcon,
  StarIcon,
  ShieldCheckIcon,
  BeakerIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";

export type AppRole = "admin" | "manager" | "hall" | "cashier" | "cast";

export interface NavigationItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  resource?: string;
}

export const navigationItems: NavigationItem[] = [
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
    name: "ボトル管理",
    href: "/bottle-keep",
    icon: BeakerIcon,
    resource: "bottle_keep",
  },
  {
    name: "レポート",
    href: "/reports",
    icon: ChartBarIcon,
    resource: "reports",
  },
  {
    name: "バックオフィス手入力",
    href: "/backoffice/manual-entry",
    icon: CreditCardIcon,
    resource: "billing",
  },
  {
    name: "プロフィール",
    href: "/profile",
    icon: UserCircleIcon,
    resource: "profile",
  },
];

export interface QuickAction {
  id: string;
  label: string;
  href: string;
  roles?: AppRole[]; // 表示許可ロール
  icon?: ComponentType<{ className?: string }>;
}

export const quickActions: QuickAction[] = [
  {
    id: "create-booking",
    label: "予約を作成",
    href: "/bookings",
    icon: CalendarIcon,
    roles: ["admin", "manager", "hall"],
  },
  {
    id: "table-status",
    label: "テーブル状況",
    href: "/tables",
    icon: TableCellsIcon,
    roles: ["admin", "manager", "hall"],
  },
  {
    id: "qr-attendance",
    label: "QR打刻",
    href: "/qr-attendance",
    icon: QrCodeIcon,
    roles: ["admin", "manager", "hall", "cast"],
  },
  {
    id: "bottle-keep",
    label: "ボトル管理",
    href: "/bottle-keep",
    icon: BeakerIcon,
    roles: ["admin", "manager", "hall", "cashier"],
  },
  {
    id: "checkout",
    label: "会計へ",
    href: "/billing",
    icon: CreditCardIcon,
    roles: ["admin", "manager", "cashier"],
  },
  {
    id: "inventory",
    label: "在庫管理",
    href: "/inventory",
    icon: CubeIcon,
    roles: ["admin", "manager"],
  },
  {
    id: "customers",
    label: "顧客検索",
    href: "/customers",
    icon: UsersIcon,
    roles: ["admin", "manager", "hall", "cashier"],
  },
  {
    id: "dashboard",
    label: "ダッシュボード",
    href: "/dashboard",
    icon: BoltIcon,
  },
];

export const commandPaletteCommands = [
  ...quickActions.map((q) => ({
    id: q.id,
    label: q.label,
    href: q.href,
    icon: q.icon,
  })),
  ...navigationItems.map((n) => ({
    id: `nav-${n.href}`,
    label: n.name,
    href: n.href,
    icon: n.icon,
  })),
];
