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
    try {
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
        throw new Error(
          this.handleDatabaseError(
            error,
            "シフトテンプレートの作成に失敗しました"
          )
        );
      }

      return this.mapToShiftTemplate(template);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("createShiftTemplate failed:", error);
      }
      throw error;
    }
  }

  async getShiftTemplateById(id: string): Promise<ShiftTemplate | null> {
    try {
      const { data, error } = await this.supabase
        .from("shift_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw new Error(
          this.handleDatabaseError(
            error,
            "シフトテンプレートの取得に失敗しました"
          )
        );
      }

      return this.mapToShiftTemplate(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getShiftTemplateById failed:", error);
      }
      throw error;
    }
  }

  async getAllShiftTemplates(): Promise<ShiftTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from("shift_templates")
        .select("*")
        .order("name");

      if (error) {
        throw new Error(
          this.handleDatabaseError(
            error,
            "シフトテンプレートの取得に失敗しました"
          )
        );
      }

      return data.map(this.mapToShiftTemplate);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getAllShiftTemplates failed:", error);
      }
      throw error;
    }
  }

  async updateShiftTemplate(
    id: string,
    data: UpdateShiftTemplateData
  ): Promise<ShiftTemplate> {
    try {
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
        throw new Error(
          this.handleDatabaseError(
            error,
            "シフトテンプレートの更新に失敗しました"
          )
        );
      }

      return this.mapToShiftTemplate(template);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("updateShiftTemplate failed:", error);
      }
      throw error;
    }
  }

  async deleteShiftTemplate(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("shift_templates")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(
          this.handleDatabaseError(
            error,
            "シフトテンプレートの削除に失敗しました"
          )
        );
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("deleteShiftTemplate failed:", error);
      }
      throw error;
    }
  }

  // ============= SHIFT REQUEST MANAGEMENT =============

  async createShiftRequest(
    data: CreateShiftRequestData
  ): Promise<ShiftRequest> {
    try {
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
        throw new Error(
          this.handleDatabaseError(error, "シフト申請の作成に失敗しました")
        );
      }

      return this.mapToShiftRequest(request);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("createShiftRequest failed:", error);
      }
      throw error;
    }
  }

  async searchShiftRequests(
    params: ShiftRequestSearchParams = {}
  ): Promise<ShiftRequest[]> {
    try {
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
        throw new Error(
          this.handleDatabaseError(error, "シフト申請の検索に失敗しました")
        );
      }

      return data.map(this.mapToShiftRequest);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("searchShiftRequests failed:", error);
      }
      throw error;
    }
  }

  async approveShiftRequest(
    id: string,
    data: ApproveShiftRequestData
  ): Promise<ShiftRequest> {
    try {
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
        throw new Error(
          this.handleDatabaseError(error, "シフト申請の承認処理に失敗しました")
        );
      }

      return this.mapToShiftRequest(request);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("approveShiftRequest failed:", error);
      }
      throw error;
    }
  }

  // ============= CONFIRMED SHIFT MANAGEMENT =============

  async createConfirmedShift(
    data: CreateConfirmedShiftData
  ): Promise<ConfirmedShift> {
    try {
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
        throw new Error(
          this.handleDatabaseError(error, "確定シフトの作成に失敗しました")
        );
      }

      return this.mapToConfirmedShift(shift);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("createConfirmedShift failed:", error);
      }
      throw error;
    }
  }

  async searchConfirmedShifts(
    params: ConfirmedShiftSearchParams = {}
  ): Promise<ConfirmedShift[]> {
    try {
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
        throw new Error(
          this.handleDatabaseError(error, "確定シフトの検索に失敗しました")
        );
      }

      return data.map(this.mapToConfirmedShift);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("searchConfirmedShifts failed:", error);
      }
      throw error;
    }
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
    try {
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
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getWeeklySchedule failed:", error);
      }
      throw error;
    }
  }

  // ============= ATTENDANCE RECORD MANAGEMENT =============

  async createAttendanceRecord(
    data: CreateAttendanceRecordData
  ): Promise<AttendanceRecord> {
    try {
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
        throw new Error(
          this.handleDatabaseError(error, "出勤記録の作成に失敗しました")
        );
      }

      return this.mapToAttendanceRecord(record);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("createAttendanceRecord failed:", error);
      }
      throw error;
    }
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

    // Calculate work hours for this week
    const { totalWorkHours, totalOvertimeHours } =
      this.calculateWeeklyWorkHours(weekAttendance);

    // Get pending requests counts
    const pendingShiftRequests = await this.searchShiftRequests({
      status: "pending",
      limit: 1000,
    });

    // Get corrections count from staff notes or modifications
    const corrections = await this.getCorrectionRequestsCount();

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
        shiftRequests: pendingShiftRequests.length,
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
    return this.toCamelCase({
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
    }) as ShiftRequest;
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

  /**
   * 週間の労働時間を計算
   */
  private calculateWeeklyWorkHours(attendanceRecords: AttendanceRecord[]): {
    totalWorkHours: number;
    totalOvertimeHours: number;
  } {
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;

    const standardWorkDayMinutes = 8 * 60; // 8時間 = 480分

    for (const record of attendanceRecords) {
      if (
        record.status !== "present" ||
        !record.clockInTime ||
        !record.clockOutTime
      ) {
        continue;
      }

      const workMinutes = this.calculateWorkMinutes(
        record.clockInTime,
        record.clockOutTime,
        record.breakStartTime,
        record.breakEndTime
      );

      totalWorkMinutes += workMinutes;

      // 残業時間計算（8時間を超えた分）
      if (workMinutes > standardWorkDayMinutes) {
        totalOvertimeMinutes += workMinutes - standardWorkDayMinutes;
      }
    }

    return {
      totalWorkHours: Math.round((totalWorkMinutes / 60) * 100) / 100, // 小数点第2位まで
      totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
    };
  }

  /**
   * 実働時間を分単位で計算
   */
  private calculateWorkMinutes(
    clockInTime: string,
    clockOutTime: string,
    breakStartTime?: string | null,
    breakEndTime?: string | null
  ): number {
    const clockInMinutes = this.timeToMinutes(clockInTime);
    const clockOutMinutes = this.timeToMinutes(clockOutTime);

    let workMinutes = clockOutMinutes - clockInMinutes;

    // 休憩時間を差し引く
    if (breakStartTime && breakEndTime) {
      const breakStartMinutes = this.timeToMinutes(breakStartTime);
      const breakEndMinutes = this.timeToMinutes(breakEndTime);
      const breakDuration = breakEndMinutes - breakStartMinutes;
      workMinutes -= breakDuration;
    }

    return Math.max(0, workMinutes);
  }

  /**
   * HH:MM形式の時刻を分単位に変換
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  /**
   * 修正依頼数を取得
   */
  private async getCorrectionRequestsCount(): Promise<number> {
    try {
      // 修正依頼は出勤記録のnotesに "修正依頼" が含まれているもので計算
      const { data, error } = await this.supabase
        .from("attendance_records")
        .select("id")
        .ilike("notes", "%修正依頼%")
        .gte(
          "created_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        ); // 過去1週間

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error fetching correction requests:", error);
        }
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error in getCorrectionRequestsCount:", error);
      }
      return 0;
    }
  }

  /**
   * Delete a confirmed shift
   */
  async deleteConfirmedShift(shiftId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("confirmed_shifts")
        .delete()
        .eq("id", shiftId);

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "シフトの削除に失敗しました")
        );
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to delete confirmed shift:", error);
      }
      throw error;
    }
  }

  /**
   * Delete a shift request
   */
  async deleteShiftRequest(requestId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("shift_requests")
        .delete()
        .eq("id", requestId);

      if (error) {
        throw new Error(
          this.handleDatabaseError(
            error,
            "シフトリクエストの削除に失敗しました"
          )
        );
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to delete shift request:", error);
      }
      throw error;
    }
  }
}

// Export singleton instance
export const attendanceService = new AttendanceService();
