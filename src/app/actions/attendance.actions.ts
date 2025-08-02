"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  AttendanceDashboard,
  AttendanceRecord,
  WeeklySchedule,
  ShiftRequest,
  CreateShiftRequestInput,
  ShiftRequestSearchInput,
} from "@/types/attendance.types";

/**
 * 勤怠ダッシュボードのデータを取得するサーバーアクション
 */
export async function getAttendanceDashboardAction(): Promise<
  | {
      success: true;
      data: AttendanceDashboard;
    }
  | {
      success: false;
      error: string;
    }
> {
  try {
    // サーバー用のSupabaseクライアントを作成
    const supabase = await createClient();

    const today = new Date().toISOString().split("T")[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];

    // Use optimized RPC function to get dashboard stats
    const { data: statsData, error: statsError } = await supabase.rpc(
      "get_attendance_dashboard_stats",
      { target_date: today }
    );

    if (statsError) {
      throw new Error(
        statsError.code === "42883"
          ? "Required database function is missing. Please run migrations."
          : statsError.message
      );
    }

    const stats = statsData?.[0];

    if (!stats) {
      // データが空の場合のデフォルト値
      return {
        success: true,
        data: {
          today: {
            totalStaff: 0,
            presentStaff: 0,
            lateStaff: 0,
            absentStaff: 0,
          },
          thisWeek: {
            averageAttendance: 0,
            totalWorkHours: 0,
            totalOvertimeHours: 0,
          },
          pendingRequests: {
            shiftRequests: 0,
            corrections: 0,
          },
        },
      };
    }

    // 追加のデータを並列で取得
    const [pendingCountResult, correctionCountResult, weekDataResult] =
      await Promise.all([
        supabase
          .from("shift_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("attendance_records")
          .select("*", { count: "exact", head: true })
          .eq("needs_correction", true),
        supabase
          .from("attendance_records")
          .select("*")
          .gte("date", weekStartStr)
          .lte("date", today),
      ]);

    // 週間の勤務時間を計算
    let totalWorkHours = 0;
    let totalOvertimeHours = 0;
    if (weekDataResult.data) {
      for (const record of weekDataResult.data) {
        if (record.clock_in && record.clock_out) {
          const clockIn = new Date(record.clock_in);
          const clockOut = new Date(record.clock_out);
          const workMinutes =
            (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
          const workHours = workMinutes / 60;
          totalWorkHours += workHours;

          // 8時間を超えた分を残業時間として計算
          if (workHours > 8) {
            totalOvertimeHours += workHours - 8;
          }
        }
      }
    }

    return {
      success: true,
      data: {
        today: {
          totalStaff: Number(stats.total_staff) || 0,
          presentStaff: Number(stats.present_staff) || 0,
          lateStaff: Number(stats.late_staff) || 0,
          absentStaff: Number(stats.absent_staff) || 0,
        },
        thisWeek: {
          averageAttendance: Number(stats.attendance_rate) || 0,
          totalWorkHours: Math.round(totalWorkHours),
          totalOvertimeHours: Math.round(totalOvertimeHours),
        },
        pendingRequests: {
          shiftRequests: pendingCountResult.count || 0,
          corrections: correctionCountResult.count || 0,
        },
      },
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("getAttendanceDashboardAction failed:", error);
    }
    const errorMessage =
      error instanceof Error
        ? error.message
        : "ダッシュボードデータの取得に失敗しました。";
    return { success: false, error: errorMessage };
  }
}

/**
 * 本日の勤怠記録を取得
 */
export async function getTodayAttendanceAction(): Promise<
  | { success: true; data: AttendanceRecord | null }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "認証されていません" };
    }

    // Get staff ID from user
    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (staffError || !staff) {
      return { success: false, error: "スタッフ情報が見つかりません" };
    }

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("date", today)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return { success: true, data: data || null };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "本日の勤怠記録の取得に失敗しました";
    return { success: false, error: errorMessage };
  }
}

/**
 * 出勤打刻
 */
export async function clockInAction(
  notes?: string
): Promise<
  { success: true; data: AttendanceRecord } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "認証されていません" };
    }

    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (staffError || !staff) {
      return { success: false, error: "スタッフ情報が見つかりません" };
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const clockInTime = now.toISOString();

    // Check if already clocked in today
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id, clock_in")
      .eq("staff_id", staff.id)
      .eq("date", today)
      .single();

    if (existing && existing.clock_in) {
      return { success: false, error: "既に出勤打刻済みです" };
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .upsert({
        staff_id: staff.id,
        date: today,
        clock_in: clockInTime,
        status: "present",
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "出勤打刻に失敗しました";
    return { success: false, error: errorMessage };
  }
}

/**
 * 退勤打刻
 */
export async function clockOutAction(
  notes?: string
): Promise<
  { success: true; data: AttendanceRecord } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "認証されていません" };
    }

    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (staffError || !staff) {
      return { success: false, error: "スタッフ情報が見つかりません" };
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const clockOutTime = now.toISOString();

    // Get today's record
    const { data: existing, error: fetchError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("date", today)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "本日の出勤記録が見つかりません" };
    }

    if (!existing.clock_in) {
      return { success: false, error: "出勤打刻がされていません" };
    }

    if (existing.clock_out) {
      return { success: false, error: "既に退勤打刻済みです" };
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .update({
        clock_out: clockOutTime,
        notes: existing.notes ? `${existing.notes}\n${notes || ""}` : notes,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "退勤打刻に失敗しました";
    return { success: false, error: errorMessage };
  }
}

/**
 * 休憩開始打刻
 */
export async function startBreakAction(
  notes?: string
): Promise<
  { success: true; data: AttendanceRecord } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "認証されていません" };
    }

    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (staffError || !staff) {
      return { success: false, error: "スタッフ情報が見つかりません" };
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const breakStartTime = now.toISOString();

    const { data: existing, error: fetchError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("date", today)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "本日の出勤記録が見つかりません" };
    }

    if (!existing.clock_in) {
      return { success: false, error: "出勤打刻がされていません" };
    }

    if (existing.clock_out) {
      return { success: false, error: "既に退勤済みです" };
    }

    if (existing.break_start && !existing.break_end) {
      return { success: false, error: "既に休憩中です" };
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .update({
        break_start: breakStartTime,
        break_end: null,
        notes: existing.notes ? `${existing.notes}\n${notes || ""}` : notes,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "休憩開始打刻に失敗しました";
    return { success: false, error: errorMessage };
  }
}

/**
 * 休憩終了打刻
 */
export async function endBreakAction(
  notes?: string
): Promise<
  { success: true; data: AttendanceRecord } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "認証されていません" };
    }

    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (staffError || !staff) {
      return { success: false, error: "スタッフ情報が見つかりません" };
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const breakEndTime = now.toISOString();

    const { data: existing, error: fetchError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("date", today)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "本日の出勤記録が見つかりません" };
    }

    if (!existing.break_start) {
      return { success: false, error: "休憩開始打刻がされていません" };
    }

    if (existing.break_end) {
      return { success: false, error: "既に休憩終了済みです" };
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .update({
        break_end: breakEndTime,
        notes: existing.notes ? `${existing.notes}\n${notes || ""}` : notes,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "休憩終了打刻に失敗しました";
    return { success: false, error: errorMessage };
  }
}

/**
 * 週間スケジュールを取得
 */
export async function getWeeklyScheduleAction(
  weekStart: string
): Promise<
  { success: true; data: WeeklySchedule } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "認証されていません" };
    }

    const { data, error } = await supabase.rpc("get_weekly_schedule", {
      week_start: weekStart,
    });

    if (error) {
      throw new Error(
        error.code === "42883"
          ? "Required database function is missing. Please run migrations."
          : error.message
      );
    }

    return { success: true, data: data || { weekStart, dailySchedules: [] } };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "週間スケジュールの取得に失敗しました";
    return { success: false, error: errorMessage };
  }
}

/**
 * シフト申請を検索
 */
export async function searchShiftRequestsAction(
  params?: ShiftRequestSearchInput
): Promise<
  { success: true; data: ShiftRequest[] } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "認証されていません" };
    }

    let query = supabase
      .from("shift_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (params?.status) {
      query = query.eq("status", params.status);
    }

    if (params?.staffId) {
      query = query.eq("staff_id", params.staffId);
    }

    if (params?.startDate) {
      query = query.gte("request_date", params.startDate);
    }

    if (params?.endDate) {
      query = query.lte("request_date", params.endDate);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "シフト申請の検索に失敗しました";
    return { success: false, error: errorMessage };
  }
}

/**
 * シフト申請を作成
 */
export async function createShiftRequestAction(
  input: CreateShiftRequestInput
): Promise<
  { success: true; data: ShiftRequest } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "認証されていません" };
    }

    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (staffError || !staff) {
      return { success: false, error: "スタッフ情報が見つかりません" };
    }

    const { data, error } = await supabase
      .from("shift_requests")
      .insert({
        staff_id: staff.id,
        request_date: input.requestedDate,
        shift_type: "regular",
        start_time: input.startTime,
        end_time: input.endTime,
        reason: input.notes,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "シフト申請の作成に失敗しました";
    return { success: false, error: errorMessage };
  }
}

/**
 * シフト申請を承認
 */
export async function approveShiftRequestAction(
  requestId: string
): Promise<
  { success: true; data: ShiftRequest } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "認証されていません" };
    }

    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (staffError || !staff) {
      return { success: false, error: "スタッフ情報が見つかりません" };
    }

    // Check if user has permission to approve
    if (staff.role !== "admin" && staff.role !== "manager") {
      return { success: false, error: "シフト申請を承認する権限がありません" };
    }

    const { data, error } = await supabase
      .from("shift_requests")
      .update({
        status: "approved",
        approved_by: staff.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "シフト申請の承認に失敗しました";
    return { success: false, error: errorMessage };
  }
}

/**
 * シフト申請を却下
 */
export async function rejectShiftRequestAction(
  requestId: string,
  reason: string
): Promise<
  { success: true; data: ShiftRequest } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "認証されていません" };
    }

    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (staffError || !staff) {
      return { success: false, error: "スタッフ情報が見つかりません" };
    }

    // Check if user has permission to reject
    if (staff.role !== "admin" && staff.role !== "manager") {
      return { success: false, error: "シフト申請を却下する権限がありません" };
    }

    const { data, error } = await supabase
      .from("shift_requests")
      .update({
        status: "rejected",
        approved_by: staff.id,
        approved_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "シフト申請の却下に失敗しました";
    return { success: false, error: errorMessage };
  }
}
