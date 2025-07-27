import {
  type ShiftTemplate,
  type CreateShiftTemplateInput,
  type UpdateShiftTemplateInput,
  type ShiftRequest,
  type ShiftRequestStatus,
  type CreateShiftRequestInput,
  type ApproveShiftRequestInput,
  type ShiftRequestSearchInput,
  type ConfirmedShift,
  type ConfirmedShiftStatus,
  type CreateConfirmedShiftInput,
  type ConfirmedShiftSearchInput,
  type AttendanceRecord,
  type AttendanceStatus,
  type CreateAttendanceRecordInput,
  type AttendanceSearchInput,
  type ClockAction,
  type ClockActionType,
  type CalendarShift,
  type DailySchedule,
  type WeeklySchedule,
  type ShiftType,
  type AttendanceDashboard,
  type MonthlyAttendanceSummary,
  shiftTemplateSchema,
  createShiftTemplateSchema,
  updateShiftTemplateSchema,
  shiftRequestSchema,
  shiftRequestStatusSchema,
  createShiftRequestSchema,
  approveShiftRequestSchema,
  shiftRequestSearchSchema,
  confirmedShiftSchema,
  confirmedShiftStatusSchema,
  createConfirmedShiftSchema,
  confirmedShiftSearchSchema,
  attendanceRecordSchema,
  attendanceStatusSchema,
  createAttendanceRecordSchema,
  attendanceSearchSchema,
  clockActionSchema,
  clockActionTypeSchema,
  calendarShiftSchema,
  dailyScheduleSchema,
  weeklyScheduleSchema,
  shiftTypeSchema,
  attendanceDashboardSchema,
  monthlyAttendanceSummarySchema,
} from "@/lib/validations/attendance";

// Re-export types from Zod schemas
export type {
  ShiftTemplate,
  CreateShiftTemplateInput,
  UpdateShiftTemplateInput,
};
export type {
  ShiftRequest,
  ShiftRequestStatus,
  CreateShiftRequestInput,
  ApproveShiftRequestInput,
  ShiftRequestSearchInput,
};
export type {
  ConfirmedShift,
  ConfirmedShiftStatus,
  CreateConfirmedShiftInput,
  ConfirmedShiftSearchInput,
};
export type {
  AttendanceRecord,
  AttendanceStatus,
  CreateAttendanceRecordInput,
  AttendanceSearchInput,
};
export type { ClockAction, ClockActionType };
export type { CalendarShift, DailySchedule, WeeklySchedule, ShiftType };
export type { AttendanceDashboard, MonthlyAttendanceSummary };

// Legacy aliases for backward compatibility
export type CreateShiftTemplateData = CreateShiftTemplateInput;
export type UpdateShiftTemplateData = UpdateShiftTemplateInput;
export type CreateShiftRequestData = CreateShiftRequestInput;
export type ApproveShiftRequestData = ApproveShiftRequestInput;
export type ShiftRequestSearchParams = ShiftRequestSearchInput;
export type CreateConfirmedShiftData = CreateConfirmedShiftInput;
export type ConfirmedShiftSearchParams = ConfirmedShiftSearchInput;
export type CreateAttendanceRecordData = CreateAttendanceRecordInput;
export type AttendanceSearchParams = AttendanceSearchInput;

// Export schemas for runtime validation
export {
  shiftTemplateSchema,
  createShiftTemplateSchema,
  updateShiftTemplateSchema,
  shiftRequestSchema,
  shiftRequestStatusSchema,
  createShiftRequestSchema,
  approveShiftRequestSchema,
  shiftRequestSearchSchema,
  confirmedShiftSchema,
  confirmedShiftStatusSchema,
  createConfirmedShiftSchema,
  confirmedShiftSearchSchema,
  attendanceRecordSchema,
  attendanceStatusSchema,
  createAttendanceRecordSchema,
  attendanceSearchSchema,
  clockActionSchema,
  clockActionTypeSchema,
  calendarShiftSchema,
  dailyScheduleSchema,
  weeklyScheduleSchema,
  shiftTypeSchema,
  attendanceDashboardSchema,
  monthlyAttendanceSummarySchema,
};

// Extended types with additional fields from joins
export interface ShiftRequestWithDetails extends ShiftRequest {
  cast?: {
    id: string;
    fullName: string;
    castProfile?: {
      nickname: string;
    };
  };
  approver?: {
    id: string;
    fullName: string;
  };
  staffName?: string;
  staffRole?: string;
  templateName?: string;
}

export interface ConfirmedShiftWithDetails extends ConfirmedShift {
  staff?: {
    id: string;
    fullName: string;
    role: string;
  };
  staffName?: string;
  staffRole?: string;
  templateName?: string;
}

export interface AttendanceRecordWithDetails extends AttendanceRecord {
  staff?: {
    id: string;
    fullName: string;
    role: string;
  };
  staffName?: string;
  staffRole?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  shiftTemplateName?: string;
}

// Attendance Correction types
export interface AttendanceCorrection {
  id: string;
  attendanceRecordId: string;
  correctionType: CorrectionType;
  originalValue: string | null;
  correctedValue: string | null;
  reason: string;
  requestedBy: string;
  approvedBy: string | null;
  status: CorrectionStatus;
  approvedAt: string | null;
  createdAt: string;
}

export type CorrectionType =
  | "clock_in"
  | "clock_out"
  | "break_start"
  | "break_end"
  | "manual_hours";
export type CorrectionStatus = "pending" | "approved" | "rejected";

export interface CreateAttendanceCorrectionData {
  attendanceRecordId: string;
  correctionType: CorrectionType;
  originalValue?: string;
  correctedValue: string;
  reason: string;
}

export interface ApproveCorrectionData {
  status: "approved" | "rejected";
}

// Validation and utility types
export const DAYS_OF_WEEK = [
  { value: 0, label: "日曜日", short: "日" },
  { value: 1, label: "月曜日", short: "月" },
  { value: 2, label: "火曜日", short: "火" },
  { value: 3, label: "水曜日", short: "水" },
  { value: 4, label: "木曜日", short: "木" },
  { value: 5, label: "金曜日", short: "金" },
  { value: 6, label: "土曜日", short: "土" },
] as const;

export const SHIFT_TYPES = [
  { value: "regular", label: "通常勤務" },
  { value: "overtime", label: "残業" },
  { value: "holiday", label: "休日出勤" },
] as const;

export const ATTENDANCE_STATUSES = [
  { value: "present", label: "出勤", color: "green" },
  { value: "absent", label: "欠勤", color: "red" },
  { value: "late", label: "遅刻", color: "yellow" },
  { value: "early_leave", label: "早退", color: "orange" },
] as const;

export const SHIFT_REQUEST_STATUSES = [
  { value: "pending", label: "承認待ち", color: "yellow" },
  { value: "approved", label: "承認済み", color: "green" },
  { value: "rejected", label: "却下", color: "red" },
] as const;
