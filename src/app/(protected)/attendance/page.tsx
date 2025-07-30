import { AttendanceClient } from "./_components/AttendanceClient";
import { getAttendanceDashboardAction } from "@/app/actions/attendance.actions";

export default async function AttendancePage() {
  const result = await getAttendanceDashboardAction();

  return (
    <AttendanceClient
      initialDashboardData={result.success ? result.data : null}
      error={!result.success ? result.error || null : null}
    />
  );
}
