import { BaseService } from "../base.service";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AttendanceRecord,
  CreateAttendanceRecordData,
  AttendanceSearchParams,
  ClockAction,
} from "@/types/attendance.types";
import type { Database } from "@/types/database.types";

export class AttendanceTrackingService extends BaseService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    super();
    this.supabase = createClient();
  }

  async createRecord(
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

  async search(
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

    return (data || []).map(this.mapToAttendanceRecord);
  }

  async clockAction(
    staffId: string,
    action: ClockAction
  ): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split("T")[0];

    const { data: record, error } = await this.supabase
      .from("attendance_records")
      .select("*")
      .eq("staff_id", staffId)
      .eq("attendance_date", today)
      .single();

    let currentRecord = record;

    if (error && error.code === "PGRST116") {
      const newRecord = await this.createRecord({
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

  async getTodayRecordByStaffId(
    staffId: string
  ): Promise<AttendanceRecord | null> {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await this.supabase
        .from("attendance_records")
        .select("*")
        .eq("staff_id", staffId)
        .eq("attendance_date", today)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw new Error(
          this.handleDatabaseError(error, "本日の出勤記録の取得に失敗しました")
        );
      }

      return this.mapToAttendanceRecord(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getTodayRecordByStaffId failed:", error);
      }
      throw error;
    }
  }

  async getCorrectionRequestsCount(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from("attendance_records")
        .select("id")
        .ilike("notes", "%修正依頼%")
        .gte(
          "created_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        );

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

  calculateWorkMinutes(
    clockInTime: string,
    clockOutTime: string,
    breakStartTime?: string | null,
    breakEndTime?: string | null
  ): number {
    const clockInMinutes = this.timeToMinutes(clockInTime);
    const clockOutMinutes = this.timeToMinutes(clockOutTime);

    let workMinutes = clockOutMinutes - clockInMinutes;

    if (breakStartTime && breakEndTime) {
      const breakStartMinutes = this.timeToMinutes(breakStartTime);
      const breakEndMinutes = this.timeToMinutes(breakEndTime);
      const breakDuration = breakEndMinutes - breakStartMinutes;
      workMinutes -= breakDuration;
    }

    return Math.max(0, workMinutes);
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
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
      confirmedShiftId: null,
      totalWorkingMinutes: null,
      totalBreakMinutes: null,
      status: "present" as "present" | "absent" | "late" | "early_leave",
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const attendanceTrackingService = new AttendanceTrackingService();
