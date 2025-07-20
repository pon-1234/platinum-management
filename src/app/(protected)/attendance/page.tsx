"use client";

import { useState, useCallback, useEffect } from "react";
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { RoleGate } from "@/components/auth/RoleGate";
import { format } from "date-fns";
import { AttendanceService } from "@/services/attendance.service";
import { AttendanceDashboard } from "@/components/attendance/AttendanceDashboard";
import { WeeklySchedule } from "@/components/attendance/WeeklySchedule";
import { TimeClock } from "@/components/attendance/TimeClock";
import { ShiftRequestList } from "@/components/attendance/ShiftRequestList";
import type { AttendanceDashboard as AttendanceDashboardType } from "@/types/attendance.types";

type TabType = "dashboard" | "schedule" | "timeclock" | "requests";

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [dashboardData, setDashboardData] =
    useState<AttendanceDashboardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const attendanceService = new AttendanceService();

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await attendanceService.getAttendanceDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error("ダッシュボードデータの読み込みに失敗しました:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const tabs = [
    {
      id: "dashboard" as TabType,
      label: "ダッシュボード",
      icon: UserGroupIcon,
      roles: ["admin", "manager", "hall"],
    },
    {
      id: "schedule" as TabType,
      label: "スケジュール",
      icon: CalendarIcon,
      roles: ["admin", "manager", "hall"],
    },
    {
      id: "timeclock" as TabType,
      label: "タイムクロック",
      icon: ClockIcon,
      roles: ["admin", "manager", "hall", "cast"],
    },
    {
      id: "requests" as TabType,
      label: "シフト申請",
      icon: DocumentTextIcon,
      roles: ["admin", "manager"],
    },
  ];

  return (
    <RoleGate allowedRoles={["admin", "manager", "hall", "cast"]}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            勤怠管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            スタッフの出勤状況とシフト管理
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <RoleGate
                  key={tab.id}
                  allowedRoles={tab.roles as ("admin" | "manager" | "cast")[]}
                >
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    <tab.icon className="w-5 h-5 inline-block mr-2" />
                    {tab.label}
                  </button>
                </RoleGate>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === "dashboard" && (
            <RoleGate allowedRoles={["admin", "manager", "hall"]}>
              <AttendanceDashboard
                data={dashboardData}
                isLoading={isLoading}
                onRefresh={loadDashboardData}
              />
            </RoleGate>
          )}

          {activeTab === "schedule" && (
            <RoleGate allowedRoles={["admin", "manager", "hall"]}>
              <WeeklySchedule
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </RoleGate>
          )}

          {activeTab === "timeclock" && (
            <TimeClock onClockAction={loadDashboardData} />
          )}

          {activeTab === "requests" && (
            <RoleGate allowedRoles={["admin", "manager"]}>
              <ShiftRequestList onRequestUpdate={loadDashboardData} />
            </RoleGate>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
