import { BaseService } from "../base.service";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { qrGenerationService } from "./qr-generation.service";
import { qrStatisticsService } from "./qr-statistics.service";
import type {
  QRManagementData,
  StaffQRInfo,
  QRAttendanceHistory,
  LocationSettings,
} from "@/types/qr-code.types";

/**
 * QR管理・設定専用サービス
 * 責任: QRコード管理、設定管理、スタッフQR情報
 */
export class QRManagementService extends BaseService {
  private supabase: SupabaseClient<Database>;
  constructor() {
    super();
    this.supabase = createClient();
  }

  /**
   * 管理画面用データを取得
   */
  async getManagementData(): Promise<QRManagementData> {
    const [stats, activeStaffs] = await Promise.all([
      qrStatisticsService.getQRCodeStats(),
      this.getActiveStaffsWithQR(),
    ]);

    // スタッフQRコード情報にスキャン履歴を追加
    const staffQRCodes = await Promise.all(
      activeStaffs.map(async (staffInfo) => {
        const today = new Date().toISOString().split("T")[0];
        const todayScans = staffInfo.scanHistory.filter((log) =>
          log.created_at.startsWith(today)
        ).length;

        const lastScan = staffInfo.scanHistory[0];

        return {
          staffId: staffInfo.staff.id,
          staffName: staffInfo.staff.full_name,
          qrCode: staffInfo.qrCode,
          todayScans,
          lastScan,
        };
      })
    );

    return {
      stats,
      staffQRCodes,
    };
  }

  /**
   * スタッフのQRコード情報を取得
   */
  async getStaffQRInfo(staffId: string): Promise<StaffQRInfo> {
    const [staffResult, qrCodeResult, historyResult] = await Promise.all([
      this.supabase.from("staffs").select("*").eq("id", staffId).single(),
      this.supabase
        .from("qr_codes")
        .select("*")
        .eq("staff_id", staffId)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      this.getQRAttendanceHistory(staffId, undefined, undefined, 10),
    ]);

    if (staffResult.error) {
      this.handleError(staffResult.error, "スタッフ情報の取得に失敗しました");
    }

    const today = new Date().toISOString().split("T")[0];
    const todayScans = historyResult.filter(
      (h) => h.log.created_at.startsWith(today) && h.success
    ).length;

    return {
      staff: staffResult.data,
      qrCode: qrCodeResult.data || undefined,
      hasActiveQR: !!qrCodeResult.data,
      lastGenerated: qrCodeResult.data?.created_at,
      scanHistory: historyResult.map((h) => h.log),
      todayScans,
    };
  }

  /**
   * QRコード履歴を取得
   */
  async getQRAttendanceHistory(
    staffId?: string,
    startDate?: string,
    endDate?: string,
    limit = 50
  ): Promise<QRAttendanceHistory[]> {
    let query = this.supabase
      .from("qr_attendance_logs")
      .select(
        `
        *,
        staff:staffs(id, full_name, role)
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (staffId) {
      query = query.eq("staff_id", staffId);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data, error } = await query;

    if (error) {
      this.handleError(error, "QRコード履歴の取得に失敗しました");
    }

    return (data || []).map((log) => ({
      log,
      staff: log.staff,
      success: log.success,
      errorMessage: log.error_message,
    })) as QRAttendanceHistory[];
  }

  /**
   * スキャン履歴を取得
   */
  async getScanHistory(params: { staffId?: string; limit?: number }) {
    let query = this.supabase.from("qr_attendance_logs").select(`
        *,
        staff:staffs!staff_id (
          id,
          full_name
        )
      `);

    if (params.staffId) {
      query = query.eq("staff_id", params.staffId);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) this.handleError(error);

    return (data || []).map((log) => ({
      id: log.id,
      staffId: log.staff_id,
      actionType: log.action_type,
      success: log.success,
      locationData: log.location_data,
      deviceInfo: log.device_info,
      errorMessage: log.error_message,
      createdAt: log.created_at,
      staff: {
        id: log.staff.id,
        fullName: log.staff.full_name,
      },
    }));
  }

  /**
   * 位置設定を取得
   */
  async getLocationSettings(): Promise<LocationSettings> {
    const { data, error } = await this.supabase
      .from("location_settings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("位置設定取得エラー:", error);
      }
    }

    // デフォルト設定を返す
    return (
      data || {
        enabled: false,
        allowedRadius: 100,
        storeLatitude: 35.6762,
        storeLongitude: 139.6503,
        strictMode: false,
      }
    );
  }

  /**
   * 位置設定を更新
   */
  async updateLocationSettings(
    settings: Partial<LocationSettings>
  ): Promise<void> {
    // 既存の設定を無効化
    await this.supabase
      .from("location_settings")
      .update({ is_active: false })
      .eq("is_active", true);

    // 新しい設定を作成
    const { error } = await this.supabase.from("location_settings").insert({
      ...settings,
      is_active: true,
    });

    if (error) {
      this.handleError(error, "位置設定の更新に失敗しました");
    }
  }

  /**
   * 全スタッフのQRコードを一括無効化
   */
  async deactivateAllQRCodes(): Promise<void> {
    const { error } = await this.supabase
      .from("qr_codes")
      .update({ is_active: false })
      .eq("is_active", true);

    if (error) {
      this.handleError(error, "QRコードの一括無効化に失敗しました");
    }
  }

  /**
   * 期限切れQRコードをクリーンアップ
   */
  async cleanupExpiredQRCodes(): Promise<number> {
    const { data, error } = await this.supabase
      .from("qr_codes")
      .update({ is_active: false })
      .eq("is_active", true)
      .lt("expires_at", new Date().toISOString())
      .select("id");

    if (error) {
      this.handleError(error, "期限切れQRコードのクリーンアップに失敗しました");
    }

    return data?.length || 0;
  }

  /**
   * QRコードをスタッフ用に一括生成
   */
  async generateQRCodesForAllStaff(expiresIn: number = 60): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const { data: staffs, error } = await this.supabase
      .from("staffs")
      .select("id, full_name")
      .eq("is_active", true)
      .neq("role", "admin");

    if (error) {
      this.handleError(error, "スタッフ一覧の取得に失敗しました");
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const staff of staffs || []) {
      try {
        await qrGenerationService.generateQRCode({
          staffId: staff.id,
          expiresIn,
        });
        success++;
      } catch (error) {
        failed++;
        errors.push(
          `${staff.full_name}: ${error instanceof Error ? error.message : "不明なエラー"}`
        );
      }
    }

    return { success, failed, errors };
  }

  /**
   * アクティブなQRコードを持つスタッフ一覧を取得
   */
  private async getActiveStaffsWithQR(): Promise<StaffQRInfo[]> {
    const { data, error } = await this.supabase
      .from("staffs")
      .select(
        `
        *,
        qr_codes!inner(*)
      `
      )
      .eq("is_active", true)
      .eq("qr_codes.is_active", true)
      .gt("qr_codes.expires_at", new Date().toISOString());

    if (error) {
      return [];
    }

    const result: StaffQRInfo[] = [];
    for (const staff of data || []) {
      const qrInfo = await this.getStaffQRInfo(staff.id);
      result.push(qrInfo);
    }

    return result;
  }
}

export const qrManagementService = new QRManagementService();
