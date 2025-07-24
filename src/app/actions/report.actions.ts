"use server";

import { reportService } from "@/services/report.service";
import { authenticatedAction } from "@/lib/actions";
import { z } from "zod";

// 月次売上レポート取得
const getMonthlySalesReportSchema = z.object({
  year: z.number().min(2020).max(2030),
  month: z.number().min(1).max(12),
});

export const getMonthlySalesReport = authenticatedAction(
  getMonthlySalesReportSchema,
  async ({ year, month }) => {
    const report = await reportService.getMonthlySalesReport(year, month);
    return { success: true, data: report };
  }
);

// キャストパフォーマンスレポート取得
const getCastPerformanceReportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export const getCastPerformanceReport = authenticatedAction(
  getCastPerformanceReportSchema,
  async ({ startDate, endDate }) => {
    const report = await reportService.getCastPerformanceReport(
      startDate,
      endDate
    );
    return { success: true, data: report };
  }
);

// 顧客レポート取得
export const getCustomerReport = authenticatedAction(z.object({}), async () => {
  const report = await reportService.getCustomerReport();
  return { success: true, data: report };
});

// 在庫レポート取得
export const getInventoryReport = authenticatedAction(
  z.object({}),
  async () => {
    const report = await reportService.getInventoryReport();
    return { success: true, data: report };
  }
);

// 日次売上レポート取得
const getDailyRevenueReportSchema = z.object({
  date: z.string(),
});

export const getDailyRevenueReport = authenticatedAction(
  getDailyRevenueReportSchema,
  async ({ date }) => {
    const report = await reportService.getDailyRevenueReport(date);
    return { success: true, data: report };
  }
);

// 型エクスポート
export type GetMonthlySalesReportInput = z.infer<
  typeof getMonthlySalesReportSchema
>;
export type GetCastPerformanceReportInput = z.infer<
  typeof getCastPerformanceReportSchema
>;
export type GetDailyRevenueReportInput = z.infer<
  typeof getDailyRevenueReportSchema
>;
