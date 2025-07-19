import { z } from "zod";

// 血液型
export const bloodTypeSchema = z.enum(["A", "B", "O", "AB"]);

// キャストプロフィール作成用スキーマ
export const createCastSchema = z.object({
  staffId: z.string().uuid("有効なスタッフIDを指定してください"),
  stageName: z
    .string()
    .min(1, "ステージ名は必須です")
    .max(50, "ステージ名は50文字以内で入力してください"),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      const now = new Date();
      const minAge = 18;
      const age = now.getFullYear() - date.getFullYear();
      return age >= minAge;
    }, "18歳以上である必要があります"),
  bloodType: bloodTypeSchema.optional().nullable(),
  height: z
    .number()
    .int()
    .positive("身長は正の整数で入力してください")
    .max(300, "有効な身長を入力してください")
    .optional()
    .nullable(),
  threeSize: z
    .string()
    .regex(
      /^\d{2,3}-\d{2,3}-\d{2,3}$/,
      "B-W-H形式で入力してください（例: 85-60-88）"
    )
    .optional()
    .nullable(),
  hobby: z
    .string()
    .max(200, "趣味は200文字以内で入力してください")
    .optional()
    .nullable(),
  specialSkill: z
    .string()
    .max(200, "特技は200文字以内で入力してください")
    .optional()
    .nullable(),
  selfIntroduction: z
    .string()
    .max(1000, "自己紹介は1000文字以内で入力してください")
    .optional()
    .nullable(),
  profileImageUrl: z
    .string()
    .url("有効なURLを入力してください")
    .optional()
    .nullable(),
  hourlyRate: z
    .number()
    .int()
    .nonnegative("時給は0以上で入力してください")
    .max(100000, "有効な時給を入力してください"),
  backPercentage: z
    .number()
    .min(0, "バック率は0以上で入力してください")
    .max(100, "バック率は100以下で入力してください"),
  isActive: z.boolean().default(true),
});

// キャストプロフィール更新用スキーマ
export const updateCastSchema = createCastSchema
  .omit({ staffId: true })
  .partial();

// キャスト自身によるプロフィール更新用スキーマ
export const updateCastProfileSchema = z.object({
  stageName: z
    .string()
    .min(1, "ステージ名は必須です")
    .max(50, "ステージ名は50文字以内で入力してください")
    .optional(),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
    .optional()
    .nullable(),
  bloodType: bloodTypeSchema.optional().nullable(),
  height: z
    .number()
    .int()
    .positive("身長は正の整数で入力してください")
    .max(300, "有効な身長を入力してください")
    .optional()
    .nullable(),
  threeSize: z
    .string()
    .regex(
      /^\d{2,3}-\d{2,3}-\d{2,3}$/,
      "B-W-H形式で入力してください（例: 85-60-88）"
    )
    .optional()
    .nullable(),
  hobby: z
    .string()
    .max(200, "趣味は200文字以内で入力してください")
    .optional()
    .nullable(),
  specialSkill: z
    .string()
    .max(200, "特技は200文字以内で入力してください")
    .optional()
    .nullable(),
  selfIntroduction: z
    .string()
    .max(1000, "自己紹介は1000文字以内で入力してください")
    .optional()
    .nullable(),
  profileImageUrl: z
    .string()
    .url("有効なURLを入力してください")
    .optional()
    .nullable(),
});

// キャスト成績記録用スキーマ
export const createCastPerformanceSchema = z.object({
  castId: z.string().uuid("有効なキャストIDを指定してください"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください"),
  shimeiCount: z
    .number()
    .int()
    .nonnegative("指名数は0以上で入力してください")
    .default(0),
  dohanCount: z
    .number()
    .int()
    .nonnegative("同伴数は0以上で入力してください")
    .default(0),
  salesAmount: z
    .number()
    .int()
    .nonnegative("売上金額は0以上で入力してください")
    .default(0),
  drinkCount: z
    .number()
    .int()
    .nonnegative("ドリンク数は0以上で入力してください")
    .default(0),
});

// キャスト成績更新用スキーマ
export const updateCastPerformanceSchema = createCastPerformanceSchema
  .omit({ castId: true })
  .partial();

// キャスト検索用スキーマ
export const castSearchSchema = z.object({
  query: z.string().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

// キャスト成績検索用スキーマ
export const castPerformanceSearchSchema = z.object({
  castId: z.string().uuid().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
    .optional(),
  period: z.enum(["daily", "weekly", "monthly"]).optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

// Type exports
export type CreateCastInput = z.infer<typeof createCastSchema>;
export type UpdateCastInput = z.infer<typeof updateCastSchema>;
export type UpdateCastProfileInput = z.infer<typeof updateCastProfileSchema>;
export type CreateCastPerformanceInput = z.infer<
  typeof createCastPerformanceSchema
>;
export type UpdateCastPerformanceInput = z.infer<
  typeof updateCastPerformanceSchema
>;
export type CastSearchInput = z.infer<typeof castSearchSchema>;
export type CastPerformanceSearchInput = z.infer<
  typeof castPerformanceSearchSchema
>;
export type BloodType = z.infer<typeof bloodTypeSchema>;
