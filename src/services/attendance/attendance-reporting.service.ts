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
        // RPCが存在しない場合(code: '42883')、またはメッセージに含まれる場合にフォールバック
        if (
          statsError.code === "42883" ||
          statsError.message.includes("function get_attendance_dashboard_stats")
        ) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "RPC get_attendance_dashboard_stats not found, falling back to client-side calculation"
            );
          }
          return this.getDashboardFallback();
        } else {
          // その他のRPCエラーの場合はエラーをスローする
          throw statsError;
        }
      }

      const stats = statsData?.[0];

      if (!stats) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "RPC get_attendance_dashboard_stats returned no data, falling back."
          );
        }
        return this.getDashboardFallback();
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
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to get attendance dashboard:", error);
      }
      return this.getDashboardFallback();
    }
  }

  // Fallback method for backward compatibility
  private async getDashboardFallback(): Promise<AttendanceDashboard> {
    const today = new Date().toISOString().split("T")[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const todayAttendance = await attendanceTrackingService.search({
      startDate: today,
      endDate: today,
    });

    const totalStaff = todayAttendance.length;
    const presentStaff = todayAttendance.filter(
      (a) => a.status === "present"
    ).length;
    const lateStaff = todayAttendance.filter((a) => a.status === "late").length;
    const absentStaff = todayAttendance.filter(
      (a) => a.status === "absent"
    ).length;

    const weekAttendance = await attendanceTrackingService.search({
      startDate: weekStartStr,
      endDate: today,
    });

    const averageAttendance =
      weekAttendance.length > 0
        ? (weekAttendance.filter((a) => a.status === "present").length /
            weekAttendance.length) *
          100
        : 0;

    const { totalWorkHours, totalOvertimeHours } =
      this.calculateWeeklyWorkHours(weekAttendance);

    const pendingShiftRequests = await shiftRequestService.getPendingCount();
    const corrections =
      await attendanceTrackingService.getCorrectionRequestsCount();

    return {
      today: {
        totalStaff,
        presentStaff,
        lateStaff,
        absentStaff,
      },
      thisWeek: {
        averageAttendance,
        totalWorkHours,
        totalOvertimeHours,
      },
      pendingRequests: {
        shiftRequests: pendingShiftRequests,
        corrections,
      },
    };
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
        // RPCが存在しない場合(code: '42883')、またはメッセージに含まれる場合にフォールバック
        if (
          error.code === "42883" ||
          error.message.includes("function get_monthly_attendance_summary")
        ) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "RPC get_monthly_attendance_summary not found, falling back to client-side calculation"
            );
          }
          return this.getMonthlyAttendanceSummaryFallback(staffId, month);
        }
        throw error;
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
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to get monthly attendance summary:", error);
      }
      return this.getMonthlyAttendanceSummaryFallback(staffId, month);
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

  // Fallback method
  private async getMonthlyAttendanceSummaryFallback(
    staffId: string,
    month: string
  ): Promise<MonthlyAttendanceSummary> {
    const startDate = `${month}-01`;
    const endDate = new Date(month + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    const endDateStr = endDate.toISOString().split("T")[0];

    const records = await attendanceTrackingService.search({
      staffId,
      startDate,
      endDate: endDateStr,
    });

    const totalWorkDays = records.length;
    const presentDays = records.filter((r) => r.status === "present").length;
    const absentDays = records.filter((r) => r.status === "absent").length;
    const lateDays = records.filter((r) => r.status === "late").length;

    const totalWorkHours =
      records.reduce((sum, record) => {
        return sum + (record.totalWorkingMinutes || 0);
      }, 0) / 60;

    const totalOvertimeHours =
      records.reduce((sum, record) => {
        const workingMinutes = record.totalWorkingMinutes || 0;
        const overtimeMinutes = Math.max(0, workingMinutes - 480);
        return sum + overtimeMinutes;
      }, 0) / 60;

    return {
      totalWorkDays,
      totalWorkHours,
      totalOvertimeHours,
      presentDays,
      absentDays,
      lateDays,
    };
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
