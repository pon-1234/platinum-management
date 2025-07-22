import { z } from "zod";

export const IdTypes = [
  "license",
  "passport",
  "mynumber",
  "residence_card",
] as const;
export type IdType = (typeof IdTypes)[number];

export const ReportTypes = [
  "employee_list",
  "complaint_log",
  "business_report",
  "tax_report",
] as const;
export type ReportType = (typeof ReportTypes)[number];

export const ReportStatuses = ["generated", "submitted", "approved"] as const;
export type ReportStatus = (typeof ReportStatuses)[number];

export const idVerificationSchema = z.object({
  customerId: z.string().uuid("顧客IDが無効です"),
  idType: z.enum(IdTypes),
  idImageUrl: z.string().url("画像URLが無効です").optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "生年月日の形式が正しくありません")
    .optional(),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "有効期限の形式が正しくありません")
    .optional(),
  ocrResult: z.record(z.string(), z.unknown()).optional(),
  isVerified: z.boolean().default(false),
  notes: z.string().optional(),
});

export const complianceReportSchema = z.object({
  reportType: z.enum(ReportTypes),
  periodStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "開始日の形式が正しくありません"),
  periodEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "終了日の形式が正しくありません"),
  status: z.enum(ReportStatuses).default("generated"),
  filePath: z.string().optional(),
  notes: z.string().optional(),
});

export const idVerificationSearchSchema = z.object({
  idType: z.enum(IdTypes).optional(),
  isVerified: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const complianceReportSearchSchema = z.object({
  reportType: z.enum(ReportTypes).optional(),
  status: z.enum(ReportStatuses).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type IdVerificationInput = z.infer<typeof idVerificationSchema>;
export type ComplianceReportInput = z.infer<typeof complianceReportSchema>;
export type IdVerificationSearchParams = z.infer<
  typeof idVerificationSearchSchema
>;
export type ComplianceReportSearchParams = z.infer<
  typeof complianceReportSearchSchema
>;
