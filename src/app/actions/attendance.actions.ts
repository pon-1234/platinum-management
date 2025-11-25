"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  AttendanceDashboard,
  AttendanceRecord,
  WeeklySchedule,
  ShiftRequest,
  CreateShiftRequestInput,
  ShiftRequestSearchInput,
} from "@/types/attendance.types";
import type { PostgrestError } from "@supabase/supabase-js";

type LegacyAttendanceRecord = {
  id?: string;
  attendance_date?: string | null;
  date?: string | null;
  clock_in?: string | null;
  clock_in_time?: string | null;
  clock_out?: string | null;
  clock_out_time?: string | null;
  break_start?: string | null;
  break_start_time?: string | null;
  break_end?: string | null;
  break_end_time?: string | null;
  notes?: string | null;
};

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
        // needs_correction 列がない環境では0件扱い
        (async () => {
          const res = await supabase
            .from("attendance_records")
            .select("*", { count: "exact", head: true })
            .eq("needs_correction", true);
          return res.error ? { count: 0 } : res;
        })(),
        // 週次データは新旧カラム両対応
        (async () => {
          const res1 = await supabase
            .from("attendance_records")
            .select("attendance_date, clock_in_time, clock_out_time")
            .gte("attendance_date", weekStartStr)
            .lte("attendance_date", today);
          if (!res1.error) return res1;
          const res2 = await supabase
            .from("attendance_records")
            .select("date, clock_in, clock_out")
            .gte("date", weekStartStr)
            .lte("date", today);
          return res2;
        })(),
      ]);

    // 週間の勤務時間を計算
    let totalWorkHours = 0;
    let totalOvertimeHours = 0;
    if (weekDataResult.data) {
      type WeekRecord = {
        clock_in_time?: string | null;
        clock_out_time?: string | null;
        clock_in?: string | null;
        clock_out?: string | null;
      };
      const weekRecords = weekDataResult.data as WeekRecord[];
      for (const record of weekRecords) {
        const ci = record.clock_in_time || record.clock_in;
        const co = record.clock_out_time || record.clock_out;
        if (ci && co) {
          const clockIn = new Date(ci);
          const clockOut = new Date(co);
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
      // Keep server actions minimal; avoid importing logger here
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

    // 新旧カラム両対応で取得
    let data: AttendanceRecord | null = null;
    let error: PostgrestError | null = null;
    const r1 = await supabase
      .from("attendance_records")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("attendance_date", today)
      .maybeSingle();
    if (!r1.error && r1.data) {
      data = r1.data;
    } else {
      const r2 = await supabase
        .from("attendance_records")
        .select("*")
        .eq("staff_id", staff.id)
        .eq("date", today)
        .maybeSingle();
      data = r2.data;
      error = r2.error;
    }

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

    // Check if already clocked in today（新旧カラム対応）
    let existing: LegacyAttendanceRecord | null = null;
    const e1 = await supabase
      .from("attendance_records")
      .select("id, clock_in_time")
      .eq("staff_id", staff.id)
      .eq("attendance_date", today)
      .maybeSingle();
    if (!e1.error && e1.data) existing = e1.data;
    if (!existing) {
      const e2 = await supabase
        .from("attendance_records")
        .select("id, clock_in")
        .eq("staff_id", staff.id)
        .eq("date", today)
        .maybeSingle();
      if (!e2.error && e2.data) existing = e2.data;
    }

    if (existing && existing.clock_in) {
      return { success: false, error: "既に出勤打刻済みです" };
    }

    // 新旧カラムへ upsert 試行
    let data: AttendanceRecord | null = null;
    let error: PostgrestError | null = null;
    const u1 = await supabase
      .from("attendance_records")
      .upsert({
        staff_id: staff.id,
        attendance_date: today,
        clock_in_time: clockInTime,
        status: "present",
        notes: notes || null,
      })
      .select()
      .maybeSingle();
    if (!u1.error && u1.data) {
      data = u1.data;
    } else {
      const u2 = await supabase
        .from("attendance_records")
        .upsert({
          staff_id: staff.id,
          date: today,
          clock_in: clockInTime,
          status: "present",
          notes: notes || null,
        })
        .select()
        .maybeSingle();
      data = u2.data;
      error = u2.error;
    }

    if (error) throw error;

    revalidatePath("/attendance");
    const result = data ?? (existing as unknown as AttendanceRecord);
    return { success: true, data: result };
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
    // 新旧カラムで本日の記録取得
    let existing: LegacyAttendanceRecord | null = null;
    let fetchError: PostgrestError | null = null;
    const f1 = await supabase
      .from("attendance_records")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("attendance_date", today)
      .maybeSingle();
    if (!f1.error && f1.data) existing = f1.data;
    else {
      const f2 = await supabase
        .from("attendance_records")
        .select("*")
        .eq("staff_id", staff.id)
        .eq("date", today)
        .maybeSingle();
      existing = f2.data;
      fetchError = f2.error;
    }

    if (fetchError || !existing) {
      return { success: false, error: "本日の出勤記録が見つかりません" };
    }

    if (!(existing.clock_in_time || existing.clock_in)) {
      return { success: false, error: "出勤打刻がされていません" };
    }

    if (existing.clock_out_time || existing.clock_out) {
      return { success: false, error: "既に退勤打刻済みです" };
    }

    // 新旧カラムで更新
    let data: AttendanceRecord | null = null;
    let error: PostgrestError | null = null;
    const uo1 = await supabase
      .from("attendance_records")
      .update({
        clock_out_time: clockOutTime,
        notes: existing.notes ? `${existing.notes}\n${notes || ""}` : notes,
      })
      .eq("id", existing.id)
      .select()
      .maybeSingle();
    if (!uo1.error && uo1.data) data = uo1.data;
    else {
      const uo2 = await supabase
        .from("attendance_records")
        .update({
          clock_out: clockOutTime,
          notes: existing.notes ? `${existing.notes}\n${notes || ""}` : notes,
        })
        .eq("id", existing.id)
        .select()
        .maybeSingle();
      data = uo2.data;
      error = uo2.error;
    }

    if (error) throw error;

    revalidatePath("/attendance");
    const result = data ?? (existing as unknown as AttendanceRecord);
    return { success: true, data: result };
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

    // 新旧カラムで取得
    let existing: LegacyAttendanceRecord | null = null;
    let fetchError: PostgrestError | null = null;
    const sb1 = await supabase
      .from("attendance_records")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("attendance_date", today)
      .maybeSingle();
    if (!sb1.error && sb1.data) existing = sb1.data;
    else {
      const sb2 = await supabase
        .from("attendance_records")
        .select("*")
        .eq("staff_id", staff.id)
        .eq("date", today)
        .maybeSingle();
      existing = sb2.data;
      fetchError = sb2.error;
    }

    if (fetchError || !existing) {
      return { success: false, error: "本日の出勤記録が見つかりません" };
    }

    if (!existing.clock_in) {
      return { success: false, error: "出勤打刻がされていません" };
    }

    if (existing.clock_out) {
      return { success: false, error: "既に退勤済みです" };
    }

    if (
      (existing.break_start_time || existing.break_start) &&
      !(existing.break_end_time || existing.break_end)
    ) {
      return { success: false, error: "既に休憩中です" };
    }

    // 新旧カラムで更新
    let data: AttendanceRecord | null = null;
    let error: PostgrestError | null = null;
    const bs1 = await supabase
      .from("attendance_records")
      .update({
        break_start_time: breakStartTime,
        break_end_time: null,
        notes: existing.notes ? `${existing.notes}\n${notes || ""}` : notes,
      })
      .eq("id", existing.id)
      .select()
      .maybeSingle();
    if (!bs1.error && bs1.data) data = bs1.data;
    else {
      const bs2 = await supabase
        .from("attendance_records")
        .update({
          break_start: breakStartTime,
          break_end: null,
          notes: existing.notes ? `${existing.notes}\n${notes || ""}` : notes,
        })
        .eq("id", existing.id)
        .select()
        .maybeSingle();
      data = bs2.data;
      error = bs2.error;
    }

    if (error) throw error;

    revalidatePath("/attendance");
    const result = data ?? (existing as unknown as AttendanceRecord);
    return { success: true, data: result };
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

    // 新旧カラムで取得
    let existing: LegacyAttendanceRecord | null = null;
    let fetchError: PostgrestError | null = null;
    const be1 = await supabase
      .from("attendance_records")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("attendance_date", today)
      .maybeSingle();
    if (!be1.error && be1.data) existing = be1.data;
    else {
      const be2 = await supabase
        .from("attendance_records")
        .select("*")
        .eq("staff_id", staff.id)
        .eq("date", today)
        .maybeSingle();
      existing = be2.data;
      fetchError = be2.error;
    }

    if (fetchError || !existing) {
      return { success: false, error: "本日の出勤記録が見つかりません" };
    }

    if (!(existing.break_start_time || existing.break_start)) {
      return { success: false, error: "休憩開始打刻がされていません" };
    }

    if (existing.break_end_time || existing.break_end) {
      return { success: false, error: "既に休憩終了済みです" };
    }

    // 新旧カラムで更新
    let data: AttendanceRecord | null = null;
    let error: PostgrestError | null = null;
    const beu1 = await supabase
      .from("attendance_records")
      .update({
        break_end_time: breakEndTime,
        notes: existing.notes ? `${existing.notes}\n${notes || ""}` : notes,
      })
      .eq("id", existing.id)
      .select()
      .maybeSingle();
    if (!beu1.error && beu1.data) data = beu1.data;
    else {
      const beu2 = await supabase
        .from("attendance_records")
        .update({
          break_end: breakEndTime,
          notes: existing.notes ? `${existing.notes}\n${notes || ""}` : notes,
        })
        .eq("id", existing.id)
        .select()
        .maybeSingle();
      data = beu2.data;
      error = beu2.error;
    }

    if (error) throw error;

    revalidatePath("/attendance");
    const result = data ?? (existing as unknown as AttendanceRecord);
    if (!result) {
      return { success: false, error: "休憩終了の記録に失敗しました" };
    }
    return { success: true, data: result };
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
