import { z } from "zod";

// ボトルキープ作成のバリデーション
export const createBottleKeepSchema = z.object({
  customer_id: z.string().uuid("有効な顧客IDを入力してください"),
  product_id: z.string().uuid("有効な商品IDを入力してください"),
  opened_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください")
    .optional(),
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください")
    .optional(),
  storage_location: z
    .string()
    .max(100, "保管場所は100文字以内で入力してください")
    .optional(),
  table_number: z
    .string()
    .max(20, "テーブル番号は20文字以内で入力してください")
    .optional(),
  host_staff_id: z
    .string()
    .uuid("有効なスタッフIDを入力してください")
    .optional(),
  notes: z.string().max(500, "備考は500文字以内で入力してください").optional(),
  tags: z.array(z.string()).optional(),
});

// ボトルキープ更新のバリデーション
export const updateBottleKeepSchema = z.object({
  remaining_percentage: z
    .number()
    .min(0, "残量は0以上で入力してください")
    .max(1, "残量は1以下で入力してください")
    .optional(),
  storage_location: z
    .string()
    .max(100, "保管場所は100文字以内で入力してください")
    .optional(),
  table_number: z
    .string()
    .max(20, "テーブル番号は20文字以内で入力してください")
    .optional(),
  host_staff_id: z
    .string()
    .uuid("有効なスタッフIDを入力してください")
    .optional(),
  notes: z.string().max(500, "備考は500文字以内で入力してください").optional(),
  status: z
    .enum(["active", "consumed", "expired", "removed"], {
      errorMap: () => ({ message: "無効なステータスです" }),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  last_served_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください")
    .optional(),
});

// ボトル提供のバリデーション
export const serveBottleSchema = z.object({
  bottle_keep_id: z.string().uuid("有効なボトルIDを入力してください"),
  visit_id: z.string().uuid("有効な来店IDを入力してください").optional(),
  served_amount: z
    .number()
    .positive("提供量は0より大きい値を入力してください")
    .max(1, "提供量は1以下で入力してください"),
  notes: z.string().max(500, "備考は500文字以内で入力してください").optional(),
});

// クエリパラメータのバリデーション
export const getBottleKeepsQuerySchema = z.object({
  status: z.enum(["active", "consumed", "expired", "removed"]).optional(),
  customer_id: z.string().uuid().optional(),
});

// ボトル移動のバリデーション
export const moveBottleSchema = z.object({
  bottle_keep_id: z.string().uuid("有効なボトルIDを入力してください"),
  to_location: z
    .string()
    .min(1, "移動先を入力してください")
    .max(100, "移動先は100文字以内で入力してください"),
  reason: z.string().max(200, "理由は200文字以内で入力してください").optional(),
});

// 型エクスポート
export type CreateBottleKeepInput = z.infer<typeof createBottleKeepSchema>;
export type UpdateBottleKeepInput = z.infer<typeof updateBottleKeepSchema>;
export type ServeBottleInput = z.infer<typeof serveBottleSchema>;
export type GetBottleKeepsQuery = z.infer<typeof getBottleKeepsQuerySchema>;
export type MoveBottleInput = z.infer<typeof moveBottleSchema>;
