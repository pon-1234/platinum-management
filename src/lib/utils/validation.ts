import { z } from "zod";

// Common validation schemas
export const emailSchema = z
  .string()
  .email("有効なメールアドレスを入力してください");

export const phoneSchema = z
  .string()
  .regex(/^[\d-+().\s]+$/, "有効な電話番号を入力してください")
  .min(10, "電話番号は10文字以上で入力してください");

export const requiredStringSchema = z
  .string()
  .min(1, "この項目は必須です")
  .trim();

export const optionalStringSchema = z.string().optional();

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "有効な日付を入力してください（YYYY-MM-DD）");

export const positiveNumberSchema = z
  .number()
  .positive("正の数値を入力してください");

export const nonNegativeNumberSchema = z
  .number()
  .min(0, "0以上の数値を入力してください");

// Common validation utilities
export const validateRequired = (value: string | undefined | null): boolean => {
  return Boolean(value && value.trim().length > 0);
};

export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success;
};

export const validatePhone = (phone: string): boolean => {
  return phoneSchema.safeParse(phone).success;
};

export const validateDate = (date: string): boolean => {
  return dateSchema.safeParse(date).success;
};

// Error message utilities
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || "バリデーションエラーが発生しました";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "エラーが発生しました";
};
