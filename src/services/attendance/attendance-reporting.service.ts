import { BaseService } from "../base.service";
import { attendanceTrackingService } from "./attendance-tracking.service";
import { shiftRequestService } from "./shift-request.service";
import type {
  AttendanceRecord,
  AttendanceDashboard,
  MonthlyAttendanceSummary,
} from "@/types/attendance.types";

export class AttendanceReportingService extends BaseService {
  constructor() {
    super();
  }

  async getDashboard(): Promise<AttendanceDashboard> {
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
