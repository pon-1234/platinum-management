"use client";

import { memo } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { AttendanceDashboard } from "@/components/attendance/AttendanceDashboard";
import type { AttendanceDashboard as AttendanceDashboardType } from "@/types/attendance.types";

interface AttendanceDashboardTabProps {
  data: AttendanceDashboardType | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const AttendanceDashboardTab = memo(
  ({ data, isLoading, onRefresh }: AttendanceDashboardTabProps) => {
    return (
      <RoleGate allowedRoles={["admin", "manager", "hall"]}>
        <AttendanceDashboard
          data={data}
          isLoading={isLoading}
          onRefresh={onRefresh}
        />
      </RoleGate>
    );
  }
);

AttendanceDashboardTab.displayName = "AttendanceDashboardTab";
