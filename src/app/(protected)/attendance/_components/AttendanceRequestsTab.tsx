"use client";

import { memo } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { Access } from "@/components/auth/Access";
import { ShiftRequestList } from "@/components/attendance/ShiftRequestList";

interface AttendanceRequestsTabProps {
  onRequestUpdate: () => void;
}

export const AttendanceRequestsTab = memo(
  ({ onRequestUpdate }: AttendanceRequestsTabProps) => {
    return (
      <Access
        roles={["admin", "manager"]}
        resource="attendance"
        action="manage"
        require="any"
      >
        <ShiftRequestList onRequestUpdate={onRequestUpdate} />
      </Access>
    );
  }
);

AttendanceRequestsTab.displayName = "AttendanceRequestsTab";
