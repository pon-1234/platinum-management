import { BaseService } from "@/services/base.service";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { qrGenerationService } from "./qr-generation.service";
import type {
  QRAttendanceRequest,
  QRAttendanceResponse,
  QRAttendanceHistory,
  QRAttendanceAction,
} from "@/types/qr-code.types";

/**
 * QR出勤管理専用サービス
 * 責任: QRコードを使った出勤記録、履歴管理
 */
export class QRAttendanceService extends BaseService {
  private supabase: SupabaseClient<Database>;
  constructor() {
    super();
    this.supabase = createClient();
  }

  /**
   * QRコードによる出勤記録
   */
  async recordAttendance(
    request: QRAttendanceRequest
  ): Promise<QRAttendanceResponse> {
    try {
      // QRコード検証
      const validationResult = await qrGenerationService.validateQRCode(
        request.qrData
      );

      if (!validationResult.isValid) {
        return {
          success: false,
          message: "バリデーションエラー",
          timestamp: new Date().toISOString(),
          action: request.action,
          error: "QRコードの検証に失敗しました",
        };
      }

      const staffId = validationResult.staffId;

      // 位置情報検証
      const locationValid =
        request.locationData &&
        request.locationData.latitude &&
        request.locationData.longitude
          ? await this.validateLocation(
              request.locationData as {
                latitude: number;
                longitude: number;
                accuracy?: number;
              }
            )
          : true;
      if (!locationValid) {
        return {
          success: false,
          message: "位置情報エラー",
          timestamp: new Date().toISOString(),
          action: request.action,
          error: "指定された場所からの出勤が必要です",
        };
      }

      // 重複出勤チェック
      const isDuplicate = await this.checkDuplicateAttendance(
        staffId!,
        request.action
      );
      if (isDuplicate) {
        return {
          success: false,
          message: "重複エラー",
          timestamp: new Date().toISOString(),
          action: request.action,
          error: `本日は既に${
            request.action === "clock_in" ? "出勤" : "退勤"
          }済みです`,
        };
      }

      // 出勤記録作成
      await this.createAttendanceRecord({
        staffId: staffId!,
        action: request.action,
        locationData: request.locationData,
        deviceInfo: request.deviceInfo,
        qrCodeId: "unknown",
      });

      // 出勤試行ログ記録
      await this.logAttendanceAttempt({
        staffId: staffId!,
        qrCodeId: "unknown",
        success: true,
        action: request.action,
        locationData: request.locationData,
        deviceInfo: request.deviceInfo,
      });

      // QRコードを無効化（使い捨て）
      await this.supabase
        .from("qr_codes")
        .update({ is_active: false })
        .eq("staff_id", staffId!);

      return {
        success: true,
        message: `${
          request.action === "clock_in" ? "出勤" : "退勤"
        }が正常に記録されました`,
        timestamp: new Date().toISOString(),
        action: request.action,
        staffName: staffId, // スタッフ名の代わりにIDを使用
      };
    } catch (error) {
      logger.error("出勤記録エラー", error, "QRAttendanceService");

      // エラーログ記録
      if (request.qrData) {
        try {
          const validationResult = await qrGenerationService.validateQRCode(
            request.qrData
          );
          if (validationResult.isValid && validationResult.staffId) {
            await this.logAttendanceAttempt({
              staffId: validationResult.staffId,
              qrCodeId: "unknown",
              success: false,
              action: request.action,
              locationData: request.locationData,
              deviceInfo: request.deviceInfo,
              error: error instanceof Error ? error.message : "不明なエラー",
            });
          }
        } catch (logError) {
          logger.error("エラーログ記録失敗", logError, "QRAttendanceService");
        }
      }

      return {
        success: false,
        message: "システムエラー",
        timestamp: new Date().toISOString(),
        action: request.action,
        error: "出勤記録に失敗しました。管理者にお問い合わせください。",
      };
    }
  }

  /**
   * QR出勤履歴を取得
   */
  async getQRAttendanceHistory(params: {
    staffId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    data: QRAttendanceHistory[];
    totalCount: number;
  }> {
    let query = this.supabase.from("qr_attendance_logs").select(
      `
        *,
        staff:staffs(full_name, role),
        qr_code:qr_codes(qr_data, expires_at)
      `,
      { count: "exact" }
    );

    if (params.staffId) {
      query = query.eq("staff_id", params.staffId);
    }

    if (params.startDate) {
      query = query.gte("created_at", params.startDate.toISOString());
    }

    if (params.endDate) {
      query = query.lte("created_at", params.endDate.toISOString());
    }

    query = query
      .order("created_at", { ascending: false })
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 50));

    const { data, error, count } = await query;

    if (error) {
      this.handleError(error, "出勤履歴の取得に失敗しました");
    }

    const history = data.map(
      (
        item: Database["public"]["Tables"]["qr_attendance_logs"]["Row"] & {
          staff?: { full_name: string } | null;
          qr_code?: { qr_data: string; expires_at: string } | null;
        }
      ) => ({
        id: item.id,
        staffId: item.staff_id,
        staffName: item.staff?.full_name || "未知",
        actionType: item.action_type,
        success: item.success,
        error: item.error_message,
        locationData: item.location_data,
        deviceInfo: item.device_info,
        createdAt: item.created_at,
        qrCodeData: item.qr_code?.qr_data,
      })
    );

    return {
      data: history as unknown as QRAttendanceHistory[], // 型の不整合のため、unknownを経由してキャスト
      totalCount: count || 0,
    };
  }

  /**
   * 位置情報検証
   */
  private async validateLocation(locationData?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  }): Promise<boolean> {
    if (!locationData) {
      return true; // 位置情報が不要な場合
    }

    // 設定から許可位置を取得
    const { data: settings } = await this.supabase
      .from("location_settings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!settings) {
      return true; // 位置制限設定がない場合は許可
    }

    // 距離計算（Haversine公式）
    const distance = this.calculateDistance(
      locationData.latitude,
      locationData.longitude,
      settings.latitude,
      settings.longitude
    );

    return distance <= settings.radius_meters;
  }

  /**
   * 重複出勤チェック
   */
  private async checkDuplicateAttendance(
    staffId: string,
    action: QRAttendanceAction
  ): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await this.supabase
      .from("qr_attendance_logs")
      .select("id")
      .eq("staff_id", staffId)
      .eq("action_type", action === "clock_in" ? "check_in" : "check_out")
      .eq("success", true)
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString())
      .limit(1);

    if (error) {
      if (process.env.NODE_ENV === "development") {
        logger.error("重複チェックエラー", error, "QRAttendanceService");
      }
      return false;
    }

    return data && data.length > 0;
  }

  /**
   * 出勤記録作成
   */
  private async createAttendanceRecord(params: {
    staffId: string;
    action: QRAttendanceAction;
    locationData?: Record<string, unknown>;
    deviceInfo?: Record<string, unknown>;
    qrCodeId: string;
  }): Promise<void> {
    const { error } = await this.supabase.from("attendance_records").insert({
      staff_id: params.staffId,
      attendance_date: new Date().toISOString().split("T")[0],
      clock_in_time:
        params.action === "clock_in" ? new Date().toISOString() : null,
      clock_out_time:
        params.action === "clock_out" ? new Date().toISOString() : null,
      status: "present",
    });

    if (error) {
      this.handleError(error, "出勤記録の作成に失敗しました");
    }
  }

  /**
   * 出勤試行ログ記録
   */
  private async logAttendanceAttempt(params: {
    staffId: string;
    qrCodeId: string;
    success: boolean;
    action: QRAttendanceAction;
    locationData?: Record<string, unknown>;
    deviceInfo?: Record<string, unknown>;
    error?: string;
  }): Promise<void> {
    await this.supabase.from("qr_attendance_logs").insert({
      staff_id: params.staffId,
      qr_code_id: params.qrCodeId,
      action_type: params.action === "clock_in" ? "check_in" : "check_out",
      success: params.success,
      location_data: params.locationData,
      device_info: params.deviceInfo,
      error: params.error,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * 距離計算（Haversine公式）
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // 地球の半径（メートル）
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const qrAttendanceService = new QRAttendanceService();
