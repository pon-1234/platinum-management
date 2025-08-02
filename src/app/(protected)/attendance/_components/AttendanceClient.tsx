"use client";

import { useState, useCallback, lazy, Suspense } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { format } from "date-fns";
import { attendanceService } from "@/services/attendance.service";
import type { AttendanceDashboard as AttendanceDashboardType } from "@/types/attendance.types";
import {
  AttendanceTabNavigation,
  type TabType,
} from "./AttendanceTabNavigation";

// Lazy load tab components for better performance
const AttendanceDashboardTab = lazy(() =>
  import("./AttendanceDashboardTab").then((m) => ({
    default: m.AttendanceDashboardTab,
  }))
);
const AttendanceScheduleTab = lazy(() =>
  import("./AttendanceScheduleTab").then((m) => ({
    default: m.AttendanceScheduleTab,
  }))
);
const AttendanceTimeClockTab = lazy(() =>
  import("./AttendanceTimeClockTab").then((m) => ({
    default: m.AttendanceTimeClockTab,
  }))
);
const AttendanceRequestsTab = lazy(() =>
  import("./AttendanceRequestsTab").then((m) => ({
    default: m.AttendanceRequestsTab,
  }))
);

// Loading component for Suspense fallback
const TabLoadingFallback = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

interface AttendanceClientProps {
  initialDashboardData: AttendanceDashboardType | null;
  error: string | null;
}

export function AttendanceClient({
  initialDashboardData,
  error,
}: AttendanceClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [dashboardData, setDashboardData] =
    useState<AttendanceDashboardType | null>(initialDashboardData);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize callback functions to prevent unnecessary re-renders
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await attendanceService.getAttendanceDashboard();
      setDashboardData(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("ダッシュボードデータの読み込みに失敗しました:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <RoleGate allowedRoles={["admin", "manager", "hall", "cast"]}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">勤怠管理</h1>
          <p className="text-gray-600 mt-2">スタッフの出勤状況とシフト管理</p>
        </div>

        {/* Tab Navigation */}
        <AttendanceTabNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Tab Content with Lazy Loading */}
        <Suspense fallback={<TabLoadingFallback />}>
          {activeTab === "dashboard" && (
            <AttendanceDashboardTab
              data={dashboardData}
              isLoading={isLoading}
              onRefresh={loadDashboardData}
            />
          )}

          {activeTab === "schedule" && (
            <AttendanceScheduleTab
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
            />
          )}

          {activeTab === "timeclock" && (
            <AttendanceTimeClockTab onClockAction={loadDashboardData} />
          )}

          {activeTab === "requests" && (
            <AttendanceRequestsTab onRequestUpdate={loadDashboardData} />
          )}
        </Suspense>
      </div>
    </RoleGate>
  );
}
