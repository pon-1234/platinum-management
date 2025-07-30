import { BaseService } from "../base.service";
import { attendanceTrackingService } from "./attendance-tracking.service";
import { shiftRequestService } from "./shift-request.service";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  AttendanceRecord,
  AttendanceDashboard,
  MonthlyAttendanceSummary,
} from "@/types/attendance.types";

export class AttendanceReportingService extends BaseService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    super();
    this.supabase = createClient();
  }

  async getDashboard(): Promise<AttendanceDashboard> {
    const today = new Date().toISOString().split("T")[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];

    try {
      // Use optimized RPC function to get dashboard stats
      const { data: statsData, error: statsError } = await this.supabase.rpc(
        "get_attendance_dashboard_stats",
        { target_date: today }
      );

      if (statsError) {
        console.error("Attendance dashboard RPC error:", statsError);
        throw new Error(
          statsError.code === "42883"
            ? "Required database function is missing. Please run migrations."
            : this.handleDatabaseError(
                statsError,
                "勤怠ダッシュボードデータの取得に失敗しました"
              )
        );
      }

      const stats = statsData?.[0];

      if (!stats) {
        throw new Error("勤怠ダッシュボードデータが見つかりません");
      }

      // Get weekly data in parallel
      const [
        weekAttendanceResult,
        pendingShiftRequestsResult,
        correctionsResult,
      ] = await Promise.all([
        attendanceTrackingService.search({
          startDate: weekStartStr,
          endDate: today,
        }),
        shiftRequestService.getPendingCount(),
        attendanceTrackingService.getCorrectionRequestsCount(),
      ]);

      const { totalWorkHours, totalOvertimeHours } =
        this.calculateWeeklyWorkHours(weekAttendanceResult);

      const averageAttendance = Number(stats.attendance_rate) || 0;

      return {
        today: {
          totalStaff: Number(stats.total_staff) || 0,
          presentStaff: Number(stats.present_count) || 0,
          lateStaff: Number(stats.late_count) || 0,
          absentStaff: Number(stats.absent_count) || 0,
        },
        thisWeek: {
          averageAttendance,
          totalWorkHours,
          totalOvertimeHours,
        },
        pendingRequests: {
          shiftRequests: pendingShiftRequestsResult,
          corrections: correctionsResult,
        },
      };
    } catch (error) {
      console.error("Failed to get attendance dashboard:", error);
      throw error;
    }
  }

  async getMonthlyAttendanceSummary(
    staffId: string,
    month: string
  ): Promise<MonthlyAttendanceSummary> {
    try {
      const [year, monthNum] = month.split("-").map(Number);

      // Use optimized RPC function
      const { data, error } = await this.supabase.rpc(
        "get_monthly_attendance_summary",
        {
          target_year: year,
          target_month: monthNum,
          staff_id_filter: staffId,
        }
      );

      if (error) {
        console.error("Monthly attendance summary RPC error:", error);
        throw new Error(
          error.code === "42883"
            ? "Required database function is missing. Please run migrations."
            : this.handleDatabaseError(
                error,
                "月次勤怠サマリーの取得に失敗しました"
              )
        );
      }

      if (!data || data.length === 0) {
        return {
          totalWorkDays: 0,
          totalWorkHours: 0,
          totalOvertimeHours: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
        };
      }

      const summary = data[0];

      // Convert interval to hours
      const workingHours = this.intervalToHours(summary.total_working_hours);
      const overtimeHours = this.intervalToHours(summary.total_overtime_hours);

      return {
        totalWorkDays: Number(summary.total_days) || 0,
        totalWorkHours: workingHours,
        totalOvertimeHours: overtimeHours,
        presentDays: Number(summary.present_days) || 0,
        absentDays: Number(summary.absent_days) || 0,
        lateDays: Number(summary.late_days) || 0,
      };
    } catch (error) {
      console.error("Failed to get monthly attendance summary:", error);
      throw error;
    }
  }

  // Helper function to convert PostgreSQL interval to hours
  private intervalToHours(interval: string | null): number {
    if (!interval) return 0;
    // Parse PostgreSQL interval format (e.g., "125:30:00" or "PT125H30M")
    const match = interval.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      return hours + minutes / 60;
    }
    return 0;
  }

  async generateMonthlyReport(month: string): Promise<{
    staffSummaries: Array<{
      staffId: string;
      staffName?: string;
      summary: MonthlyAttendanceSummary;
    }>;
    overallSummary: {
      totalStaff: number;
      averageAttendanceRate: number;
      totalWorkHours: number;
      totalOvertimeHours: number;
    };
  }> {
    try {
      const { data: staffList, error } = await this.supabase
        .from("staff")
        .select("id, name")
        .eq("is_active", true);

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "スタッフリストの取得に失敗しました")
        );
      }

      const staffSummaries = await Promise.all(
        staffList.map(async (staff) => ({
          staffId: staff.id,
          staffName: staff.name,
          summary: await this.getMonthlyAttendanceSummary(staff.id, month),
        }))
      );

      const totalStaff = staffSummaries.length;
      const totalPresentDays = staffSummaries.reduce(
        (sum, s) => sum + s.summary.presentDays,
        0
      );
      const totalWorkDays = staffSummaries.reduce(
        (sum, s) => sum + s.summary.totalWorkDays,
        0
      );
      const averageAttendanceRate =
        totalWorkDays > 0 ? (totalPresentDays / totalWorkDays) * 100 : 0;
      const totalWorkHours = staffSummaries.reduce(
        (sum, s) => sum + s.summary.totalWorkHours,
        0
      );
      const totalOvertimeHours = staffSummaries.reduce(
        (sum, s) => sum + s.summary.totalOvertimeHours,
        0
      );

      return {
        staffSummaries,
        overallSummary: {
          totalStaff,
          averageAttendanceRate,
          totalWorkHours,
          totalOvertimeHours,
        },
      };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("generateMonthlyReport failed:", error);
      }
      throw error;
    }
  }

  private calculateWeeklyWorkHours(attendanceRecords: AttendanceRecord[]): {
    totalWorkHours: number;
    totalOvertimeHours: number;
  } {
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;

    const standardWorkDayMinutes = 8 * 60;

    for (const record of attendanceRecords) {
      if (
        record.status !== "present" ||
        !record.clockInTime ||
        !record.clockOutTime
      ) {
        continue;
      }

      const workMinutes = attendanceTrackingService.calculateWorkMinutes(
        record.clockInTime,
        record.clockOutTime,
        record.breakStartTime,
        record.breakEndTime
      );

      totalWorkMinutes += workMinutes;

      if (workMinutes > standardWorkDayMinutes) {
        totalOvertimeMinutes += workMinutes - standardWorkDayMinutes;
      }
    }

    return {
      totalWorkHours: Math.round((totalWorkMinutes / 60) * 100) / 100,
      totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
    };
  }
}

export const attendanceReportingService = new AttendanceReportingService();
