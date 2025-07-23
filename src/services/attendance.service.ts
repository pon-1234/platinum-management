import { BaseService } from "./base.service";
import type { Database } from "@/types/database.types";
import type {
  ShiftTemplate,
  ShiftRequest,
  ConfirmedShift,
  AttendanceRecord,
  CreateShiftTemplateData,
  UpdateShiftTemplateData,
  CreateShiftRequestData,
  ApproveShiftRequestData,
  ShiftRequestSearchParams,
  CreateConfirmedShiftData,
  ConfirmedShiftSearchParams,
  CreateAttendanceRecordData,
  AttendanceSearchParams,
  ClockAction,
  AttendanceDashboard,
  MonthlyAttendanceSummary,
  WeeklySchedule,
  CalendarShift,
  DailySchedule,
  ShiftType,
} from "@/types/attendance.types";

export class AttendanceService extends BaseService {
  constructor() {
    super();
  }

  // ============= SHIFT TEMPLATE MANAGEMENT =============

  async createShiftTemplate(
    data: CreateShiftTemplateData
  ): Promise<ShiftTemplate> {
    const staffId = await this.getCurrentStaffId();

    const { data: template, error } = await this.supabase
      .from("shift_templates")
      .insert(
        this.toSnakeCase({
          name: data.name,
          startTime: data.startTime,
          endTime: data.endTime,
          daysOfWeek: data.daysOfWeek,
          isActive: data.isActive ?? true,
          createdBy: staffId,
          updatedBy: staffId,
        })
      )
      .select()
      .single();

    if (error) {
      this.handleError(error, "シフトテンプレートの作成に失敗しました");
    }

    return this.mapToShiftTemplate(template);
  }

  async getShiftTemplateById(id: string): Promise<ShiftTemplate | null> {
    const { data, error } = await this.supabase
      .from("shift_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      this.handleError(error, "シフトテンプレートの取得に失敗しました");
    }

    return this.mapToShiftTemplate(data);
  }

  async getAllShiftTemplates(): Promise<ShiftTemplate[]> {
    const { data, error } = await this.supabase
      .from("shift_templates")
      .select("*")
      .order("name");

    if (error) {
      this.handleError(error, "シフトテンプレートの取得に失敗しました");
    }

    return data.map(this.mapToShiftTemplate);
  }

  async updateShiftTemplate(
    id: string,
    data: UpdateShiftTemplateData
  ): Promise<ShiftTemplate> {
    const staffId = await this.getCurrentStaffId();

    const updateData = this.toSnakeCase({
      updatedBy: staffId,
      ...data,
    });

    const { data: template, error } = await this.supabase
      .from("shift_templates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.handleError(error, "シフトテンプレートの更新に失敗しました");
    }

    return this.mapToShiftTemplate(template);
  }

  async deleteShiftTemplate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("shift_templates")
      .delete()
      .eq("id", id);

    if (error) {
      this.handleError(error, "シフトテンプレートの削除に失敗しました");
    }
  }

  // ============= SHIFT REQUEST MANAGEMENT =============

  async createShiftRequest(
    data: CreateShiftRequestData
  ): Promise<ShiftRequest> {
    const { data: request, error } = await this.supabase
      .from("shift_requests")
      .insert(
        this.toSnakeCase({
          staffId: await this.getCurrentStaffId(), // Get current staff ID
          requestedDate: data.requestedDate,
          startTime: data.startTime,
          endTime: data.endTime,
          notes: data.notes || null,
        })
      )
      .select()
      .single();

    if (error) {
      this.handleError(error, "シフト申請の作成に失敗しました");
    }

    return this.mapToShiftRequest(request);
  }

  async searchShiftRequests(
    params: ShiftRequestSearchParams = {}
  ): Promise<ShiftRequest[]> {
    let query = this.supabase
      .from("shift_requests")
      .select("*")
      .order("request_date", { ascending: false });

    if (params.staffId) {
      query = query.eq("staff_id", params.staffId);
    }

    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.startDate) {
      query = query.gte("request_date", params.startDate);
    }

    if (params.endDate) {
      query = query.lte("request_date", params.endDate);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(
        params.offset,
        params.offset + (params.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      this.handleError(error, "シフト申請の検索に失敗しました");
    }

    return data.map(this.mapToShiftRequest);
  }

  async approveShiftRequest(
    id: string,
    data: ApproveShiftRequestData
  ): Promise<ShiftRequest> {
    const staffId = await this.getCurrentStaffId();

    const updateData: Record<string, unknown> = {
      status: data.approved ? "approved" : "rejected",
      approved_by: staffId,
      approved_at: new Date().toISOString(),
    };

    if (data.rejectionReason) {
      updateData.rejection_reason = data.rejectionReason;
    }

    const { data: request, error } = await this.supabase
      .from("shift_requests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.handleError(error, "シフト申請の承認処理に失敗しました");
    }

    return this.mapToShiftRequest(request);
  }

  // ============= CONFIRMED SHIFT MANAGEMENT =============

  async createConfirmedShift(
    data: CreateConfirmedShiftData
  ): Promise<ConfirmedShift> {
    const staffId = await this.getCurrentStaffId();

    const { data: shift, error } = await this.supabase
      .from("confirmed_shifts")
      .insert({
        staff_id: data.staffId,
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        status: data.status || "scheduled",
        notes: data.notes || null,
        created_by: staffId,
        updated_by: staffId,
      })
      .select()
      .single();

    if (error) {
      this.handleError(error, "確定シフトの作成に失敗しました");
    }

    return this.mapToConfirmedShift(shift);
  }

  async searchConfirmedShifts(
    params: ConfirmedShiftSearchParams = {}
  ): Promise<ConfirmedShift[]> {
    let query = this.supabase
      .from("confirmed_shifts")
      .select("*")
      .order("date", { ascending: true });

    if (params.staffId) {
      query = query.eq("staff_id", params.staffId);
    }

    if (params.startDate) {
      query = query.gte("date", params.startDate);
    }

    if (params.endDate) {
      query = query.lte("date", params.endDate);
    }

    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(
        params.offset,
        params.offset + (params.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      this.handleError(error, "確定シフトの検索に失敗しました");
    }

    return data.map(this.mapToConfirmedShift);
  }

  /**
   * ConfirmedShiftをCalendarShiftに変換するヘルパーメソッド
   */
  private mapConfirmedShiftToCalendarShift(
    shift: ConfirmedShift
  ): CalendarShift {
    return {
      id: shift.id,
      staffId: shift.staffId,
      staffName: shift.staffName || shift.staffId, // スタッフ名があれば使用、なければIDを使用
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      shiftType: this.determineShiftType(shift), // より適切なshiftType決定ロジック
      shiftStatus: shift.status, // ConfirmedShiftのstatusを保持
      isConfirmed: shift.status !== "cancelled",
    };
  }

  /**
   * ConfirmedShiftからShiftTypeを決定するロジック
   */
  private determineShiftType(shift: ConfirmedShift): ShiftType {
    // 時間帯や曜日に基づいてシフトタイプを決定
    const startHour = parseInt(shift.startTime.split(":")[0]);
    const endHour = parseInt(shift.endTime.split(":")[0]);
    const workHours = endHour - startHour;

    // 簡単なロジック例（必要に応じて調整）
    if (workHours > 8) {
      return "overtime";
    }

    const shiftDate = new Date(shift.date);
    const dayOfWeek = shiftDate.getDay();

    // 土日の場合は休日出勤とみなす
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return "holiday";
    }

    return "regular";
  }

  async getWeeklySchedule(weekStart: string): Promise<WeeklySchedule> {
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const weekEnd = weekEndDate.toISOString().split("T")[0];

    const shifts = await this.searchConfirmedShifts({
      startDate: weekStart,
      endDate: weekEnd,
    });

    // Group shifts by date
    const shiftsByDate: Record<string, CalendarShift[]> = {};

    shifts.forEach((shift) => {
      if (!shiftsByDate[shift.date]) {
        shiftsByDate[shift.date] = [];
      }

      shiftsByDate[shift.date].push(
        this.mapConfirmedShiftToCalendarShift(shift)
      );
    });

    // Create daily schedules for all 7 days
    const days: DailySchedule[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStartDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split("T")[0];

      const dayShifts = shiftsByDate[dateStr] || [];

      days.push({
        date: dateStr,
        shifts: dayShifts,
        totalStaff: dayShifts.length,
        confirmedStaff: dayShifts.length,
      });
    }

    return {
      weekStart,
      weekEnd,
      days,
    };
  }

  // ============= ATTENDANCE RECORD MANAGEMENT =============

  async createAttendanceRecord(
    data: CreateAttendanceRecordData
  ): Promise<AttendanceRecord> {
    const { data: record, error } = await this.supabase
      .from("attendance_records")
      .insert({
        staff_id: data.staffId,
        attendance_date: data.attendanceDate,
        scheduled_start_time: data.scheduledStartTime || null,
        scheduled_end_time: data.scheduledEndTime || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) {
      this.handleError(error, "出勤記録の作成に失敗しました");
    }

    return this.mapToAttendanceRecord(record);
  }

  async searchAttendanceRecords(
    params: AttendanceSearchParams = {}
  ): Promise<AttendanceRecord[]> {
    let query = this.supabase
      .from("attendance_records")
      .select("*")
      .order("attendance_date", { ascending: false });

    if (params.staffId) {
      query = query.eq("staff_id", params.staffId);
    }

    if (params.startDate) {
      query = query.gte("attendance_date", params.startDate);
    }

    if (params.endDate) {
      query = query.lte("attendance_date", params.endDate);
    }

    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(
        params.offset,
        params.offset + (params.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      this.handleError(error, "出勤記録の検索に失敗しました");
    }

    return data.map(this.mapToAttendanceRecord);
  }

  async clockAction(
    staffId: string,
    action: ClockAction
  ): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split("T")[0];

    // Get or create today's attendance record
    const { data: record, error } = await this.supabase
      .from("attendance_records")
      .select("*")
      .eq("staff_id", staffId)
      .eq("attendance_date", today)
      .single();

    let currentRecord = record;

    if (error && error.code === "PGRST116") {
      // Record doesn't exist, create it
      const newRecord = await this.createAttendanceRecord({
        staffId,
        attendanceDate: today,
      });
      const { data: updatedRecord } = await this.supabase
        .from("attendance_records")
        .select("*")
        .eq("id", newRecord.id)
        .single();

      if (!updatedRecord) {
        this.handleError(
          new Error("出勤記録の作成に失敗しました"),
          "出勤記録の作成に失敗しました"
        );
      }

      currentRecord = updatedRecord;
    } else if (error) {
      this.handleError(error, "出勤記録の取得に失敗しました");
    }

    // Update the record based on action type
    const updateData: Record<string, unknown> = {};

    switch (action.type) {
      case "clock_in":
        updateData.clock_in_time = action.timestamp;
        updateData.status = "present";
        break;
      case "clock_out":
        updateData.clock_out_time = action.timestamp;
        break;
      case "break_start":
        updateData.break_start_time = action.timestamp;
        break;
      case "break_end":
        updateData.break_end_time = action.timestamp;
        break;
    }

    if (action.notes) {
      updateData.notes = action.notes;
    }

    const { data: updatedRecord, error: updateError } = await this.supabase
      .from("attendance_records")
      .update(updateData)
      .eq("id", currentRecord!.id)
      .select()
      .single();

    if (updateError) {
      this.handleError(updateError, "出勤記録の更新に失敗しました");
    }

    return this.mapToAttendanceRecord(updatedRecord);
  }

  // ============= DASHBOARD AND REPORTS =============

  async getAttendanceDashboard(): Promise<AttendanceDashboard> {
    const today = new Date().toISOString().split("T")[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];

    // Get today's attendance
    const todayAttendance = await this.searchAttendanceRecords({
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

    // Get this week's data (simplified)
    const weekAttendance = await this.searchAttendanceRecords({
      startDate: weekStartStr,
      endDate: today,
    });

    const averageAttendance =
      weekAttendance.length > 0
        ? (weekAttendance.filter((a) => a.status === "present").length /
            weekAttendance.length) *
          100
        : 0;

    // Get pending requests counts
    const pendingShiftRequests = await this.searchShiftRequests({
      status: "pending",
      limit: 1000,
    });

    return {
      today: {
        totalStaff,
        presentStaff,
        lateStaff,
        absentStaff,
      },
      thisWeek: {
        averageAttendance,
        totalWorkHours: 0, // TODO: Calculate from attendance records
        totalOvertimeHours: 0, // TODO: Calculate from attendance records
      },
      pendingRequests: {
        shiftRequests: pendingShiftRequests.length,
        corrections: 0, // TODO: Implement corrections count
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

    const records = await this.searchAttendanceRecords({
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
        // 標準勤務時間を8時間（480分）と仮定し、それを超えた分を残業時間とする
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

  // ============= MAPPING FUNCTIONS =============

  private mapToShiftTemplate(
    data: Database["public"]["Tables"]["shift_templates"]["Row"]
  ): ShiftTemplate {
    return this.toCamelCase({
      id: data.id,
      name: data.name,
      startTime: data.start_time,
      endTime: data.end_time,
      daysOfWeek: data.days_of_week,
      isActive: data.is_active,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }) as ShiftTemplate;
  }

  private mapToShiftRequest(
    data: Database["public"]["Tables"]["shift_requests"]["Row"]
  ): ShiftRequest {
    return {
      id: data.id,
      staffId: data.cast_id, // データベースではcast_idを使用
      shiftTemplateId: null, // デフォルト値
      requestedDate: data.request_date,
      startTime: data.start_time,
      endTime: data.end_time,
      status: data.status as "pending" | "approved" | "rejected",
      notes: data.notes,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      rejectionReason: data.rejection_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToConfirmedShift(
    data: Database["public"]["Tables"]["confirmed_shifts"]["Row"]
  ): ConfirmedShift {
    return {
      id: data.id,
      staffId: data.staff_id,
      shiftTemplateId: null, // デフォルト値
      shiftRequestId: null, // デフォルト値
      date: data.shift_date,
      startTime: data.start_time,
      endTime: data.end_time,
      status: "scheduled" as const, // デフォルト値（実際のデータベースにstatusフィールドがない場合）
      notes: data.notes,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToAttendanceRecord(
    data: Database["public"]["Tables"]["attendance_records"]["Row"]
  ): AttendanceRecord {
    return {
      id: data.id,
      staffId: data.staff_id,
      attendanceDate: data.attendance_date,
      clockInTime: data.clock_in_time,
      clockOutTime: data.clock_out_time,
      scheduledStartTime: data.scheduled_start_time || undefined,
      scheduledEndTime: data.scheduled_end_time || undefined,
      breakStartTime: data.break_start_time,
      breakEndTime: data.break_end_time,
      confirmedShiftId: null, // デフォルト値
      totalWorkingMinutes: null, // 計算される値
      totalBreakMinutes: null, // 計算される値
      status: "present" as "present" | "absent" | "late" | "early_leave", // デフォルト値
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// Export singleton instance
export const attendanceService = new AttendanceService();
