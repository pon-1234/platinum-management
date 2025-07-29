import { attendanceService } from "@/services/attendance.service";
import { AttendanceClient } from "./_components/AttendanceClient";

export default async function AttendancePage() {
  let dashboardData = null;
  let error = null;

  try {
    dashboardData = await attendanceService.getAttendanceDashboard();
  } catch (err) {
    error = "ダッシュボードデータの読み込みに失敗しました";
    if (process.env.NODE_ENV === "development") {
      console.error(err);
    }
  }

  return (
    <AttendanceClient initialDashboardData={dashboardData} error={error} />
  );
}
