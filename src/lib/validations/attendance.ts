import { z } from "zod";

// Shift Template schemas
export const shiftTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以内で入力してください"),
  startTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "HH:MM形式で入力してください"),
  endTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "HH:MM形式で入力してください"),
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  isActive: z.boolean().default(true),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createShiftTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以内で入力してください"),
  startTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "HH:MM形式で入力してください"),
  endTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "HH:MM形式で入力してください"),
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  isActive: z.boolean().optional(),
});

export const updateShiftTemplateSchema = createShiftTemplateSchema.partial();

// Shift Request schemas
export const shiftRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export const shiftRequestSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid(),
  staffName: z.string().optional(),
  shiftTemplateId: z.string().uuid().nullable(),
  requestedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください"),
  startTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "HH:MM形式で入力してください"),
  endTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "HH:MM形式で入力してください"),
  status: shiftRequestStatusSchema,
  notes: z.string().nullable(),
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createShiftRequestSchema = z.object({
  requestedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください"),
  startTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "HH:MM形式で入力してください"),
  endTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "HH:MM形式で入力してください"),
  notes: z.string().optional(),
});

export const approveShiftRequestSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

export const shiftRequestSearchSchema = z.object({
  staffId: z.string().uuid().optional(),
  status: shiftRequestStatusSchema.optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.number().int().positive().max(100).default(50).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});

// Confirmed Shift schemas
export const confirmedShiftStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const confirmedShiftSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid(),
  shiftTemplateId: z.string().uuid().nullable(),
  shiftRequestId: z.string().uuid().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  status: confirmedShiftStatusSchema,
  notes: z.string().nullable(),
  staffName: z.string().optional(),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createConfirmedShiftSchema = z.object({
  staffId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  status: confirmedShiftStatusSchema.optional(),
  notes: z.string().optional(),
});

export const confirmedShiftSearchSchema = z.object({
  staffId: z.string().uuid().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: confirmedShiftStatusSchema.optional(),
  limit: z.number().int().positive().max(100).default(50).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});

// Attendance Record schemas
export const attendanceStatusSchema = z.enum([
  "present",
  "absent",
  "late",
  "early_leave",
]);

export const attendanceRecordSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clockInTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .nullable(),
  clockOutTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .nullable(),
  scheduledStartTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  scheduledEndTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  breakStartTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .nullable(),
  breakEndTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .nullable(),
  confirmedShiftId: z.string().uuid().nullable(),
  totalWorkingMinutes: z.number().int().nonnegative().nullable(),
  totalBreakMinutes: z.number().int().nonnegative().nullable(),
  status: attendanceStatusSchema,
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createAttendanceRecordSchema = z.object({
  staffId: z.string().uuid(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledStartTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  scheduledEndTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  notes: z.string().optional(),
});

export const attendanceSearchSchema = z.object({
  staffId: z.string().uuid().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: attendanceStatusSchema.optional(),
  limit: z.number().int().positive().max(100).default(50).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});

// Clock Action schemas
export const clockActionTypeSchema = z.enum([
  "clock_in",
  "clock_out",
  "break_start",
  "break_end",
]);

export const clockActionSchema = z.object({
  type: clockActionTypeSchema,
  timestamp: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  notes: z.string().optional(),
});

// Calendar and Schedule schemas
export const shiftTypeSchema = z.enum(["regular", "overtime", "holiday"]);

export const calendarShiftSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid(),
  staffName: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  shiftType: shiftTypeSchema,
  shiftStatus: confirmedShiftStatusSchema.optional(),
  isConfirmed: z.boolean(),
});

export const dailyScheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shifts: z.array(calendarShiftSchema),
  totalStaff: z.number().int().nonnegative(),
  confirmedStaff: z.number().int().nonnegative(),
});

export const weeklyScheduleSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.array(dailyScheduleSchema),
});

// Dashboard schemas
export const attendanceDashboardSchema = z.object({
  today: z.object({
    totalStaff: z.number().int().nonnegative(),
    presentStaff: z.number().int().nonnegative(),
    lateStaff: z.number().int().nonnegative(),
    absentStaff: z.number().int().nonnegative(),
  }),
  thisWeek: z.object({
    averageAttendance: z.number().nonnegative(),
    totalWorkHours: z.number().nonnegative(),
    totalOvertimeHours: z.number().nonnegative(),
  }),
  pendingRequests: z.object({
    shiftRequests: z.number().int().nonnegative(),
    corrections: z.number().int().nonnegative(),
  }),
});

export const monthlyAttendanceSummarySchema = z.object({
  totalWorkDays: z.number().int().nonnegative(),
  totalWorkHours: z.number().nonnegative(),
  totalOvertimeHours: z.number().nonnegative(),
  presentDays: z.number().int().nonnegative(),
  absentDays: z.number().int().nonnegative(),
  lateDays: z.number().int().nonnegative(),
});

// Type exports
export type ShiftTemplate = z.infer<typeof shiftTemplateSchema>;
export type CreateShiftTemplateInput = z.infer<
  typeof createShiftTemplateSchema
>;
export type UpdateShiftTemplateInput = z.infer<
  typeof updateShiftTemplateSchema
>;

export type ShiftRequest = z.infer<typeof shiftRequestSchema>;
export type ShiftRequestStatus = z.infer<typeof shiftRequestStatusSchema>;
export type CreateShiftRequestInput = z.infer<typeof createShiftRequestSchema>;
export type ApproveShiftRequestInput = z.infer<
  typeof approveShiftRequestSchema
>;
export type ShiftRequestSearchInput = z.infer<typeof shiftRequestSearchSchema>;

export type ConfirmedShift = z.infer<typeof confirmedShiftSchema>;
export type ConfirmedShiftStatus = z.infer<typeof confirmedShiftStatusSchema>;
export type CreateConfirmedShiftInput = z.infer<
  typeof createConfirmedShiftSchema
>;
export type ConfirmedShiftSearchInput = z.infer<
  typeof confirmedShiftSearchSchema
>;

export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;
export type CreateAttendanceRecordInput = z.infer<
  typeof createAttendanceRecordSchema
>;
export type AttendanceSearchInput = z.infer<typeof attendanceSearchSchema>;

export type ClockAction = z.infer<typeof clockActionSchema>;
export type ClockActionType = z.infer<typeof clockActionTypeSchema>;

export type CalendarShift = z.infer<typeof calendarShiftSchema>;
export type DailySchedule = z.infer<typeof dailyScheduleSchema>;
export type WeeklySchedule = z.infer<typeof weeklyScheduleSchema>;
export type ShiftType = z.infer<typeof shiftTypeSchema>;

export type AttendanceDashboard = z.infer<typeof attendanceDashboardSchema>;
export type MonthlyAttendanceSummary = z.infer<
  typeof monthlyAttendanceSummarySchema
>;
