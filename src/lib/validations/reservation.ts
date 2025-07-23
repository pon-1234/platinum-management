import { z } from "zod";

// 予約ステータス
export const reservationStatusSchema = z.enum([
  "pending",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
  "no_show",
]);

// テーブルステータス
export const tableStatusSchema = z.enum([
  "available",
  "reserved",
  "occupied",
  "cleaning",
]);

// 予約作成用スキーマ
export const createReservationSchema = z.object({
  customerId: z.string().uuid("有効な顧客IDを指定してください"),
  tableId: z
    .string()
    .uuid("有効なテーブルIDを指定してください")
    .optional()
    .nullable(),
  reservationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
    .refine((date) => {
      const reservationDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return reservationDate >= today;
    }, "過去の日付は指定できません"),
  reservationTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "HH:MM形式で入力してください"),
  numberOfGuests: z
    .number()
    .int()
    .positive("人数は1名以上で入力してください")
    .max(20, "人数は20名以下で入力してください"),
  assignedCastId: z
    .string()
    .uuid("有効なキャストIDを指定してください")
    .optional()
    .nullable(),
  specialRequests: z
    .string()
    .max(500, "特別なリクエストは500文字以内で入力してください")
    .optional()
    .nullable(),
  status: reservationStatusSchema.default("pending"),
});

// 予約更新用スキーマ
export const updateReservationSchema = createReservationSchema
  .partial()
  .extend({
    checkedInAt: z.string().datetime().optional().nullable(),
    cancelledAt: z.string().datetime().optional().nullable(),
    cancelReason: z
      .string()
      .max(200, "キャンセル理由は200文字以内で入力してください")
      .optional()
      .nullable(),
  });

// チェックイン用スキーマ
export const checkInReservationSchema = z.object({
  tableId: z.string().uuid("有効なテーブルIDを指定してください"),
});

// キャンセル用スキーマ
export const cancelReservationSchema = z.object({
  cancelReason: z
    .string()
    .min(1, "キャンセル理由を入力してください")
    .max(200, "キャンセル理由は200文字以内で入力してください"),
});

// テーブル作成用スキーマ
export const createTableSchema = z.object({
  tableName: z
    .string()
    .min(1, "テーブル名は必須です")
    .max(50, "テーブル名は50文字以内で入力してください")
    .regex(/^[A-Za-z0-9\-]+$/, "テーブル名は英数字とハイフンのみ使用できます"),
  capacity: z
    .number()
    .int()
    .positive("収容人数は1名以上で入力してください")
    .max(50, "収容人数は50名以下で入力してください"),
  location: z
    .string()
    .max(100, "場所は100文字以内で入力してください")
    .optional()
    .nullable(),
  isVip: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// テーブル更新用スキーマ
export const updateTableSchema = createTableSchema.partial().extend({
  currentStatus: tableStatusSchema.optional(),
  currentVisitId: z.string().uuid().optional().nullable(),
});

// テーブルステータス更新用スキーマ
export const updateTableStatusSchema = z.object({
  status: tableStatusSchema,
  visitId: z.string().uuid().optional().nullable(),
});

// 予約検索用スキーマ
export const reservationSearchSchema = z.object({
  customerId: z.string().uuid().optional(),
  tableId: z.string().uuid().optional(),
  assignedCastId: z.string().uuid().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
    .optional(),
  status: reservationStatusSchema.optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

// テーブル検索用スキーマ
export const tableSearchSchema = z.object({
  search: z.string().optional(),
  status: tableStatusSchema.optional(),
  isVip: z.boolean().optional(),
  isActive: z.boolean().optional(),
  minCapacity: z.number().int().positive().optional(),
  maxCapacity: z.number().int().positive().optional(),
});

// Type exports
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type CheckInReservationInput = z.infer<typeof checkInReservationSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type UpdateTableStatusInput = z.infer<typeof updateTableStatusSchema>;
export type ReservationSearchInput = z.infer<typeof reservationSearchSchema>;
export type TableSearchInput = z.infer<typeof tableSearchSchema>;
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;
export type TableStatus = z.infer<typeof tableStatusSchema>;
