"use client";

import { memo } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { ShiftRequestList } from "@/components/attendance/ShiftRequestList";

interface AttendanceRequestsTabProps {
  onRequestUpdate: () => void;
}

export const AttendanceRequestsTab = memo(
  ({ onRequestUpdate }: AttendanceRequestsTabProps) => {
    return (
      <RoleGate allowedRoles={["admin", "manager"]}>
        <ShiftRequestList onRequestUpdate={onRequestUpdate} />
      </RoleGate>
    );
  }
);

AttendanceRequestsTab.displayName = "AttendanceRequestsTab";
