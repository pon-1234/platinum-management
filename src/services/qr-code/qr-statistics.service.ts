import { BaseService } from "@/services/base.service";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { QRCodeStats } from "@/types/qr-code.types";

/**
 * QR統計・レポート専用サービス
 * 責任: QRコード使用統計、分析、レポート生成
 */
export class QRStatisticsService extends BaseService {
  private supabase: SupabaseClient<Database>;
  constructor() {
    super();
    this.supabase = createClient();
  }

  /**
   * QRコード統計データを取得
   */
  async getQRCodeStats(): Promise<QRCodeStats> {
    try {
      // Use optimized RPC function to get all stats in a single query
      const { data, error } = await this.supabase.rpc("get_qr_code_stats");

      if (error) {
        throw new Error(
          error.code === "42883"
            ? "Required database function is missing. Please run migrations."
            : this.handleDatabaseError(
                error,
                "QRコード統計の取得に失敗しました"
              )
        );
      }

      if (!data || data.length === 0) {
        return {
          totalScans: 0,
          successfulScans: 0,
          failedScans: 0,
          activeQRCodes: 0,
          todayScans: 0,
          monthlyScans: 0,
          uniqueUsers: 0,
          totalStaff: 0,
        };
      }

      const stats = data[0];
      return {
        totalScans: Number(stats.total_scans) || 0,
        successfulScans: Number(stats.successful_scans) || 0,
        failedScans: Number(stats.failed_scans) || 0,
        activeQRCodes: Number(stats.active_qr_codes) || 0,
        todayScans: Number(stats.today_scans) || 0,
        monthlyScans: Number(stats.total_scans) || 0, // Using total_scans as monthly for now
        uniqueUsers: Number(stats.unique_users_today) || 0,
        totalStaff: Number(stats.unique_users_today) || 0, // Using unique users as totalStaff for now
      };
    } catch (error) {
      logger.error("getQRCodeStats error", error, "QRStatisticsService");
      throw error;
    }
  }

  /**
   * 期間別統計を取得
   */
  async getPeriodStats(params: {
    startDate: Date;
    endDate: Date;
    groupBy: "day" | "week" | "month";
  }): Promise<
    Array<{
      period: string;
      totalScans: number;
      successfulScans: number;
      failedScans: number;
      uniqueUsers: number;
    }>
  > {
    const { startDate, endDate, groupBy } = params;

    const { data, error } = await this.supabase.rpc("get_qr_stats_by_period", {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      group_by: groupBy,
    });

    if (error) {
      this.handleError(error, "期間別統計の取得に失敗しました");
    }

    return data || [];
  }

  /**
   * スタッフ別使用統計を取得
   */
  async getStaffUsageStats(params: {
    staffId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<
    Array<{
      staffId: string;
      staffName: string;
      totalScans: number;
      successfulScans: number;
      failedScans: number;
      lastScan: string | null;
      avgScansPerDay: number;
    }>
  > {
    let query = this.supabase.from("qr_attendance_logs").select(`
        staff_id,
        success,
        created_at,
        staff:staffs(full_name)
      `);

    if (params.staffId) {
      query = query.eq("staff_id", params.staffId);
    }

    if (params.startDate) {
      query = query.gte("created_at", params.startDate.toISOString());
    }

    if (params.endDate) {
      query = query.lte("created_at", params.endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      this.handleError(error, "スタッフ使用統計の取得に失敗しました");
    }

    // データを集計
    const staffStats = new Map();

    for (const log of data || []) {
      const staffId = log.staff_id;
      if (!staffStats.has(staffId)) {
        staffStats.set(staffId, {
          staffId,
          staffName:
            (log.staff as unknown as { full_name: string } | null)?.full_name ||
            "未知",
          totalScans: 0,
          successfulScans: 0,
          failedScans: 0,
          lastScan: null,
          dates: new Set(),
        });
      }

      const stat = staffStats.get(staffId);
      stat.totalScans++;
      if (log.success) {
        stat.successfulScans++;
      } else {
        stat.failedScans++;
      }

      if (!stat.lastScan || log.created_at > stat.lastScan) {
        stat.lastScan = log.created_at;
      }

      stat.dates.add(log.created_at.split("T")[0]);
    }

    // 平均スキャン回数を計算
    const result = Array.from(staffStats.values()).map((stat) => ({
      staffId: stat.staffId,
      staffName: stat.staffName,
      totalScans: stat.totalScans,
      successfulScans: stat.successfulScans,
      failedScans: stat.failedScans,
      lastScan: stat.lastScan,
      avgScansPerDay:
        stat.dates.size > 0 ? stat.totalScans / stat.dates.size : 0,
    }));

    // ソートして制限
    result.sort((a, b) => b.totalScans - a.totalScans);

    return params.limit ? result.slice(0, params.limit) : result;
  }

  /**
   * エラー分析レポートを取得
   */
  async getErrorAnalysis(params: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalErrors: number;
    errorsByType: Array<{
      errorType: string;
      count: number;
      percentage: number;
    }>;
    errorsByStaff: Array<{
      staffId: string;
      staffName: string;
      errorCount: number;
    }>;
    hourlyErrorDistribution: Array<{
      hour: number;
      errorCount: number;
    }>;
  }> {
    let query = this.supabase
      .from("qr_attendance_logs")
      .select(
        `
        error_message,
        staff_id,
        created_at,
        staff:staffs(full_name)
      `
      )
      .eq("success", false);

    if (params.startDate) {
      query = query.gte("created_at", params.startDate.toISOString());
    }

    if (params.endDate) {
      query = query.lte("created_at", params.endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      this.handleError(error, "エラー分析の取得に失敗しました");
    }

    const totalErrors = data?.length || 0;

    // エラータイプ別集計
    const errorTypes = new Map<string, number>();
    const staffErrors = new Map<string, { name: string; count: number }>();
    const hourlyErrors = new Array(24).fill(0);

    for (const log of data || []) {
      const errorType = log.error_message || "不明なエラー";
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);

      if (log.staff_id) {
        const staffId = log.staff_id;
        if (!staffErrors.has(staffId)) {
          staffErrors.set(staffId, {
            name:
              (log.staff as unknown as { full_name: string } | null)
                ?.full_name || "未知",
            count: 0,
          });
        }
        staffErrors.get(staffId)!.count++;
      }

      const hour = new Date(log.created_at).getHours();
      hourlyErrors[hour]++;
    }

    return {
      totalErrors,
      errorsByType: Array.from(errorTypes.entries()).map(
        ([errorType, count]) => ({
          errorType,
          count,
          percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
        })
      ),
      errorsByStaff: Array.from(staffErrors.entries()).map(
        ([staffId, data]) => ({
          staffId,
          staffName: data.name,
          errorCount: data.count,
        })
      ),
      hourlyErrorDistribution: hourlyErrors.map((count, hour) => ({
        hour,
        errorCount: count,
      })),
    };
  }
}

export const qrStatisticsService = new QRStatisticsService();
