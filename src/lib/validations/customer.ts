import { z } from "zod";

// 日本の電話番号パターン（携帯・固定電話）
const phoneNumberRegex = /^(0[0-9]{1,4}-?[0-9]{1,4}-?[0-9]{3,4}|0[0-9]{9,10})$/;

// カタカナのみ（全角）
const katakanaRegex = /^[ァ-ヶー　]+$/;

export const customerStatusSchema = z.enum(["active", "vip", "blocked"]);

export const createCustomerSchema = z.object({
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以内で入力してください"),
  nameKana: z
    .string()
    .regex(katakanaRegex, "カタカナで入力してください")
    .max(100, "フリガナは100文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  phoneNumber: z
    .string()
    .regex(phoneNumberRegex, "有効な電話番号を入力してください")
    .optional()
    .or(z.literal("")),
  lineId: z
    .string()
    .max(50, "LINE IDは50文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      const now = new Date();
      return date <= now;
    }, "未来の日付は指定できません")
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      const minDate = new Date("1900-01-01");
      return date >= minDate;
    }, "1900年以降の日付を入力してください"),
  memo: z
    .string()
    .max(1000, "メモは1000文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  status: customerStatusSchema.default("active"),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// For the form, we need empty strings to be treated as undefined
const preprocessEmptyStrings = (val: unknown) => {
  if (val === "" || val === null) return undefined;
  return val;
};

export const createCustomerFormSchema = z.object({
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(100, "名前は100文字以内で入力してください"),
  nameKana: z.preprocess(
    preprocessEmptyStrings,
    z
      .string()
      .regex(katakanaRegex, "カタカナで入力してください")
      .max(100, "フリガナは100文字以内で入力してください")
      .optional()
  ),
  phoneNumber: z.preprocess(
    preprocessEmptyStrings,
    z
      .string()
      .regex(phoneNumberRegex, "有効な電話番号を入力してください")
      .optional()
  ),
  lineId: z.preprocess(
    preprocessEmptyStrings,
    z.string().max(50, "LINE IDは50文字以内で入力してください").optional()
  ),
  birthday: z.preprocess(
    preprocessEmptyStrings,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
      .optional()
      .refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        const now = new Date();
        return date <= now;
      }, "未来の日付は指定できません")
      .refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        const year = date.getFullYear();
        return year >= 1900 && year <= new Date().getFullYear();
      }, "有効な日付を入力してください")
  ),
  memo: z.preprocess(
    preprocessEmptyStrings,
    z.string().max(1000, "メモは1000文字以内で入力してください").optional()
  ),
  status: customerStatusSchema,
});

export const updateCustomerFormSchema = createCustomerFormSchema.partial();

export const customerSearchSchema = z.object({
  query: z.string().optional(),
  status: customerStatusSchema.optional(),
  limit: z.number().int().positive().max(100).default(20).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});

export const visitStatusSchema = z.enum(["active", "completed", "cancelled"]);

export const createVisitSchema = z.object({
  customerId: z.string().uuid("有効な顧客IDを指定してください"),
  tableId: z
    .number()
    .int()
    .positive("テーブル番号は正の整数で指定してください"),
  numGuests: z
    .number()
    .int()
    .positive("人数は1人以上で指定してください")
    .default(1),
  checkInAt: z.string().datetime().optional(),
});

export const updateVisitSchema = z.object({
  tableId: z
    .number()
    .int()
    .positive("テーブル番号は正の整数で指定してください")
    .optional(),
  checkOutAt: z.string().datetime().optional().nullable(),
  numGuests: z
    .number()
    .int()
    .positive("人数は1人以上で指定してください")
    .optional(),
  totalAmount: z
    .number()
    .int()
    .nonnegative("金額は0以上で指定してください")
    .optional()
    .nullable(),
  status: visitStatusSchema.optional(),
});

// Type exports
export type CreateCustomerInput = z.infer<typeof createCustomerFormSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerFormSchema>;
export type CustomerSearchInput = z.infer<typeof customerSearchSchema>;
export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;
export type CustomerStatus = z.infer<typeof customerStatusSchema>;
export type VisitStatus = z.infer<typeof visitStatusSchema>;
