import type { Database } from "@/types/database.types";
import type {
  ShiftTemplate,
  ShiftRequest,
  ConfirmedShift,
  AttendanceRecord,
} from "@/types/attendance.types";

/**
 * 出勤管理データマッピング専用サービス
 * 責任: データベースレコードとドメインオブジェクト間の変換
 */
export class AttendanceMapperService {
  /**
   * データベースレコードをShiftTemplateオブジェクトにマップ
   */
  mapToShiftTemplate(
    data: Database["public"]["Tables"]["shift_templates"]["Row"]
  ): ShiftTemplate {
    return {
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
    };
  }

  /**
   * データベースレコードをShiftRequestオブジェクトにマップ
   */
  mapToShiftRequest(
    data: Database["public"]["Tables"]["shift_requests"]["Row"] & {
      staff?: { full_name: string; role: string } | null;
      shift_template?: { name: string } | null;
    }
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
      staffName: data.staff?.full_name,
      staffRole: data.staff?.role,
      templateName: data.shift_template?.name,
    };
  }

  /**
   * データベースレコードをConfirmedShiftオブジェクトにマップ
   */
  mapToConfirmedShift(
    data: Database["public"]["Tables"]["confirmed_shifts"]["Row"] & {
      staff?: { full_name: string; role: string } | null;
      shift_template?: { name: string } | null;
    }
  ): ConfirmedShift {
    return {
      id: data.id,
      staffId: data.staff_id, // ConfirmedShiftではstaff_idを使用
      shiftTemplateId: null, // デフォルト値
      shiftRequestId: null, // デフォルト値
      date: data.shift_date,
      startTime: data.start_time,
      endTime: data.end_time,
      status: "scheduled" as const, // デフォルト値
      notes: data.notes,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      staffName: data.staff?.full_name,
      staffRole: data.staff?.role,
      templateName: data.shift_template?.name,
    };
  }

  /**
   * データベースレコードをAttendanceRecordオブジェクトにマップ
   */
  mapToAttendanceRecord(
    data: Database["public"]["Tables"]["attendance_records"]["Row"] & {
      staff?: { full_name: string; role: string } | null;
      confirmed_shift?: {
        start_time: string;
        end_time: string;
        shift_template?: { name: string };
      } | null;
    }
  ): AttendanceRecord {
    return {
      id: data.id,
      staffId: data.staff_id, // AttendanceRecordではstaff_idを使用
      confirmedShiftId: null, // デフォルト値
      attendanceDate: data.attendance_date,
      clockInTime: data.clock_in_time,
      clockOutTime: data.clock_out_time,
      breakStartTime: data.break_start_time,
      breakEndTime: data.break_end_time,
      totalWorkingMinutes: null, // 計算される値
      totalBreakMinutes: null, // 計算される値
      status: "present" as const, // デフォルト値
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      staffName: data.staff?.full_name,
      staffRole: data.staff?.role,
      scheduledStartTime: data.confirmed_shift?.start_time,
      scheduledEndTime: data.confirmed_shift?.end_time,
      shiftTemplateName: data.confirmed_shift?.shift_template?.name,
    };
  }

  /**
   * 曜日配列を文字列に変換
   */
  daysOfWeekToString(daysOfWeek: number[]): string {
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    return daysOfWeek.map((day) => dayNames[day]).join(", ");
  }

  /**
   * ステータスを日本語に変換
   */
  translateStatus(
    status: string,
    type: "shift_request" | "confirmed_shift" | "attendance"
  ): string {
    const translations = {
      shift_request: {
        pending: "承認待ち",
        approved: "承認済み",
        rejected: "却下",
      },
      confirmed_shift: {
        scheduled: "予定",
        completed: "完了",
        cancelled: "キャンセル",
      },
      attendance: {
        present: "出勤",
        absent: "欠勤",
        late: "遅刻",
        early_leave: "早退",
      },
    };

    return (
      translations[type][status as keyof (typeof translations)[typeof type]] ||
      status
    );
  }

  /**
   * 時間差を計算（分単位）
   */
  calculateMinutesDifference(
    startTime: string | null,
    endTime: string | null
  ): number | null {
    if (!startTime || !endTime) return null;

    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);

    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  }

  /**
   * 勤務時間を時:分形式でフォーマット
   */
  formatWorkingTime(minutes: number | null): string {
    if (minutes === null || minutes === undefined) return "-";

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  }
}

// シングルトンインスタンス
export const attendanceMapperService = new AttendanceMapperService();
