"use server";

import { createClient } from "@/lib/supabase/server";
import type { AttendanceDashboard } from "@/types/attendance.types";

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

    let dashboardData: AttendanceDashboard;

    if (statsError) {
      // RPCが存在しない場合、フォールバック処理を実行
      if (
        statsError.code === "42883" ||
        statsError.message.includes("function get_attendance_dashboard_stats")
      ) {
        // フォールバック処理: 個別にデータを取得
        const { data: todayData } = await supabase
          .from("attendance_records")
          .select("*")
          .eq("date", today);

        const { data: weekData } = await supabase
          .from("attendance_records")
          .select("*")
          .gte("date", weekStartStr)
          .lte("date", today);

        const { count: pendingCount } = await supabase
          .from("shift_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        const { count: correctionCount } = await supabase
          .from("attendance_records")
          .select("*", { count: "exact", head: true })
          .eq("needs_correction", true);

        // 週間の勤務時間を計算
        let totalWorkHours = 0;
        let totalOvertimeHours = 0;
        if (weekData) {
          for (const record of weekData) {
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

        dashboardData = {
          today: {
            totalStaff: 0, // この情報を取得するには別のクエリが必要
            presentStaff: todayData?.filter((r) => r.clock_in).length || 0,
            lateStaff: todayData?.filter((r) => r.is_late).length || 0,
            absentStaff: 0, // この情報を取得するには別のクエリが必要
          },
          thisWeek: {
            averageAttendance: 0, // 計算が複雑なため省略
            totalWorkHours: Math.round(totalWorkHours),
            totalOvertimeHours: Math.round(totalOvertimeHours),
          },
          pendingRequests: {
            shiftRequests: pendingCount || 0,
            corrections: correctionCount || 0,
          },
        };
      } else {
        // その他のRPCエラーの場合はエラーをスローする
        throw statsError;
      }
    } else {
      // RPCが成功した場合
      const stats = statsData?.[0];

      if (!stats) {
        // データが空の場合のデフォルト値
        dashboardData = {
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
        };
      } else {
        // 追加のデータを取得
        const { count: pendingCount } = await supabase
          .from("shift_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        const { count: correctionCount } = await supabase
          .from("attendance_records")
          .select("*", { count: "exact", head: true })
          .eq("needs_correction", true);

        // 週間の勤務データを取得
        const { data: weekData } = await supabase
          .from("attendance_records")
          .select("*")
          .gte("date", weekStartStr)
          .lte("date", today);

        // 週間の勤務時間を計算
        let totalWorkHours = 0;
        let totalOvertimeHours = 0;
        if (weekData) {
          for (const record of weekData) {
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

        dashboardData = {
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
            shiftRequests: pendingCount || 0,
            corrections: correctionCount || 0,
          },
        };
      }
    }

    return { success: true, data: dashboardData };
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
