"use client";

import { memo } from "react";
import { RoleGate } from "@/components/auth/RoleGate";
import { WeeklySchedule } from "@/components/attendance/WeeklySchedule";

interface AttendanceScheduleTabProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export const AttendanceScheduleTab = memo(
  ({ selectedDate, onDateChange }: AttendanceScheduleTabProps) => {
    return (
      <RoleGate allowedRoles={["admin", "manager", "hall"]}>
        <WeeklySchedule
          selectedDate={selectedDate}
          onDateChange={onDateChange}
        />
      </RoleGate>
    );
  }
);

AttendanceScheduleTab.displayName = "AttendanceScheduleTab";
