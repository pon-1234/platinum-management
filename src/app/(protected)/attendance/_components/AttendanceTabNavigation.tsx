"use client";

import { memo } from "react";
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { Access } from "@/components/auth/Access";

export type TabType = "dashboard" | "schedule" | "timeclock" | "requests";

interface Tab {
  id: TabType;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: ("admin" | "manager" | "hall" | "cast")[];
}

interface AttendanceTabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: Tab[] = [
  {
    id: "dashboard",
    label: "ダッシュボード",
    icon: UserGroupIcon,
    roles: ["admin", "manager", "hall"],
  },
  {
    id: "schedule",
    label: "スケジュール",
    icon: CalendarIcon,
    roles: ["admin", "manager", "hall"],
  },
  {
    id: "timeclock",
    label: "タイムクロック",
    icon: ClockIcon,
    roles: ["admin", "manager", "hall", "cast"],
  },
  {
    id: "requests",
    label: "シフト申請",
    icon: DocumentTextIcon,
    roles: ["admin", "manager"],
  },
];

export const AttendanceTabNavigation = memo(
  ({ activeTab, onTabChange }: AttendanceTabNavigationProps) => {
    return (
      <div className="mb-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <Access key={tab.id} roles={tab.roles}>
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  <tab.icon className="w-5 h-5 inline-block mr-2" />
                  {tab.label}
                </button>
              </Access>
            ))}
          </nav>
        </div>
      </div>
    );
  }
);

AttendanceTabNavigation.displayName = "AttendanceTabNavigation";
