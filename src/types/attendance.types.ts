// Shift Template types
export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftTemplateData {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive?: boolean;
}

export interface UpdateShiftTemplateData {
  name?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  isActive?: boolean;
}

// Shift Request types
export interface ShiftRequest {
  id: string;
  castId: string;
  requestDate: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  status: ShiftRequestStatus;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ShiftRequestStatus = "pending" | "approved" | "rejected";

export interface CreateShiftRequestData {
  castId: string;
  requestDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface UpdateShiftRequestData {
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface ApproveShiftRequestData {
  status: "approved" | "rejected";
  rejectionReason?: string;
}

export interface ShiftRequestSearchParams {
  castId?: string;
  status?: ShiftRequestStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Confirmed Shift types
export interface ConfirmedShift {
  id: string;
  staffId: string;
  shiftDate: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  shiftType: ShiftType;
  notes: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ShiftType = "regular" | "overtime" | "holiday";

export interface CreateConfirmedShiftData {
  staffId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  shiftType?: ShiftType;
  notes?: string;
}

export interface UpdateConfirmedShiftData {
  startTime?: string;
  endTime?: string;
  shiftType?: ShiftType;
  notes?: string;
}

export interface ConfirmedShiftSearchParams {
  staffId?: string;
  startDate?: string;
  endDate?: string;
  shiftType?: ShiftType;
  limit?: number;
  offset?: number;
}

// Attendance Record types
export interface AttendanceRecord {
  id: string;
  staffId: string;
  attendanceDate: string; // YYYY-MM-DD format
  clockInTime: string | null; // ISO timestamp
  clockOutTime: string | null; // ISO timestamp
  scheduledStartTime: string | null; // HH:MM format
  scheduledEndTime: string | null; // HH:MM format
  breakStartTime: string | null; // ISO timestamp
  breakEndTime: string | null; // ISO timestamp
  totalWorkMinutes: number | null;
  overtimeMinutes: number | null;
  status: AttendanceStatus;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "early_leave";

export interface CreateAttendanceRecordData {
  staffId: string;
  attendanceDate: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  notes?: string;
}

export interface UpdateAttendanceRecordData {
  clockInTime?: string;
  clockOutTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  status?: AttendanceStatus;
  notes?: string;
}

export interface AttendanceSearchParams {
  staffId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  limit?: number;
  offset?: number;
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

export type CorrectionType = "clock_in" | "clock_out" | "break_start" | "break_end" | "manual_hours";
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

// Related types with details
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
}

export interface ConfirmedShiftWithDetails extends ConfirmedShift {
  staff?: {
    id: string;
    fullName: string;
    role: string;
  };
}

export interface AttendanceRecordWithDetails extends AttendanceRecord {
  staff?: {
    id: string;
    fullName: string;
    role: string;
  };
  corrections?: AttendanceCorrection[];
}

// Monthly summary types
export interface MonthlyAttendanceSummary {
  totalWorkDays: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
}

// Calendar and schedule types
export interface CalendarShift {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: ShiftType;
  status?: AttendanceStatus;
  isConfirmed: boolean;
}

export interface DailySchedule {
  date: string;
  shifts: CalendarShift[];
  totalStaff: number;
  confirmedStaff: number;
}

export interface WeeklySchedule {
  weekStart: string;
  weekEnd: string;
  days: DailySchedule[];
}

// Time clock types
export interface ClockAction {
  type: "clock_in" | "clock_out" | "break_start" | "break_end";
  timestamp: string;
  notes?: string;
}

// Dashboard/summary types
export interface AttendanceDashboard {
  today: {
    totalStaff: number;
    presentStaff: number;
    lateStaff: number;
    absentStaff: number;
  };
  thisWeek: {
    averageAttendance: number;
    totalWorkHours: number;
    totalOvertimeHours: number;
  };
  pendingRequests: {
    shiftRequests: number;
    corrections: number;
  };
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