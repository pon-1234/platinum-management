"use server";

import { createReportService } from "@/services/report.service";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";

// 月次売上レポート取得
const getMonthlySalesReportSchema = z.object({
  year: z.number().min(2020).max(2030),
  month: z.number().min(1).max(12),
});

export const getMonthlySalesReport = createSafeAction(
  getMonthlySalesReportSchema,
  async ({ year, month }, { supabase }) => {
    const service = createReportService(supabase);
    const report = await service.getMonthlySalesReport(year, month);
    return report;
  }
);

// キャストパフォーマンスレポート取得
const getCastPerformanceReportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export const getCastPerformanceReport = createSafeAction(
  getCastPerformanceReportSchema,
  async ({ startDate, endDate }, { supabase }) => {
    const service = createReportService(supabase);
    const report = await service.getCastPerformanceReport(
      startDate,
      endDate
    );
    return report;
  }
);

// 顧客レポート取得
const getCustomerReportSchema = z.object({
  customerId: z.string(),
});

export const getCustomerReport = createSafeAction(
  getCustomerReportSchema,
  async ({ customerId }, { supabase }) => {
    const service = createReportService(supabase);
    const report = await service.getCustomerReport(customerId);
    return report;
  }
);

// 在庫レポート取得
const getInventoryReportSchema = z.object({
  date: z.string(),
});

export const getInventoryReport = createSafeAction(
  getInventoryReportSchema,
  async ({ date }, { supabase }) => {
    const service = createReportService(supabase);
    const report = await service.getInventoryReport(date);
    return report;
  }
);

// 日次売上レポート取得
const getDailyRevenueReportSchema = z.object({
  date: z.string(),
});

export const getDailyRevenueReport = createSafeAction(
  getDailyRevenueReportSchema,
  async ({ date }, { supabase }) => {
    const service = createReportService(supabase);
    const report = await service.generateDailySalesReport(date);
    return report;
  }
);

// 型エクスポート
export type GetMonthlySalesReportInput = z.infer<
  typeof getMonthlySalesReportSchema
>;
export type GetCastPerformanceReportInput = z.infer<
  typeof getCastPerformanceReportSchema
>;
export type GetCustomerReportInput = z.infer<typeof getCustomerReportSchema>;
export type GetInventoryReportInput = z.infer<typeof getInventoryReportSchema>;
export type GetDailyRevenueReportInput = z.infer<
  typeof getDailyRevenueReportSchema
>;
