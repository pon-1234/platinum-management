import { z } from "zod";

// User roles as zod enum
const userRoleEnum = z.enum(["admin", "manager", "hall", "cashier", "cast"]);

// Staff form validation schemas
export const createStaffFormSchema = z.object({
  userId: z.string().min(1, "ユーザーIDは必須です").trim(),
  fullName: z.string().min(1, "名前は必須です").trim(),
  role: userRoleEnum,
  hireDate: z.string().min(1, "雇用日は必須です"),
  isActive: z.boolean().optional(),
});

export const updateStaffFormSchema = z.object({
  fullName: z.string().min(1, "名前は必須です").trim(),
  role: userRoleEnum,
  isActive: z.boolean(),
});

export type CreateStaffFormData = z.infer<typeof createStaffFormSchema>;
export type UpdateStaffFormData = z.infer<typeof updateStaffFormSchema>;
