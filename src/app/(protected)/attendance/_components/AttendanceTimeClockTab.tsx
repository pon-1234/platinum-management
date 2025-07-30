"use client";

import { memo } from "react";
import { TimeClock } from "@/components/attendance/TimeClock";

interface AttendanceTimeClockTabProps {
  onClockAction: () => void;
}

export const AttendanceTimeClockTab = memo(
  ({ onClockAction }: AttendanceTimeClockTabProps) => {
    return <TimeClock onClockAction={onClockAction} />;
  }
);

AttendanceTimeClockTab.displayName = "AttendanceTimeClockTab";
