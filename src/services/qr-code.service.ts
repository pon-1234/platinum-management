import { BaseService } from "./base.service";
import type {
  QRCode,
  // QRAttendanceLog,
  GenerateQRCodeRequest,
  // QRScanResult,
  QRAttendanceRequest,
  QRAttendanceResponse,
  QRCodeStats,
  QRAttendanceHistory,
  QRValidationResult,
  StaffQRInfo,
  QRManagementData,
  LocationSettings,
  // DeviceInfo,
  // LocationData,
} from "@/types/qr-code.types";

export class QRCodeService extends BaseService {
  private secretKey: string | null = null;

  constructor() {
    super();
  }

  private getSecretKey(): string {
    if (!this.secretKey) {
      // 環境変数からシークレットキーを取得
      const secretKey = process.env.QR_CODE_SECRET_KEY;
      if (!secretKey) {
        // 開発環境用のデフォルトキー（本番環境では必ず環境変数を設定すること）
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "QR_CODE_SECRET_KEY is not set. Using development default. " +
              "Please set it in your .env.local file for production. " +
              "You can generate a secure key using: openssl rand -base64 32"
          );
          this.secretKey = "dev-secret-key-do-not-use-in-production";
        } else {
          throw new Error(
            "QR_CODE_SECRET_KEY is not set in environment variables. " +
              "Please set it in your environment variables."
          );
        }
      } else {
        this.secretKey = secretKey;
      }
    }
    return this.secretKey;
  }

  // QRコード生成
  async generateQRCode(request: GenerateQRCodeRequest): Promise<QRCode> {
    const expiresIn = request.expiresIn || 60; // デフォルト60分
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresIn);

    // 既存のアクティブなQRコードを無効化
    await this.deactivateStaffQRCodes(request.staffId);

    // QRコードデータの生成
    const qrData = this.generateQRData(request.staffId, expiresAt);
    const signature = this.generateSignature(qrData);

    const { data, error } = await this.supabase
      .from("qr_codes")
      .insert({
        staff_id: request.staffId,
        qr_data: qrData,
        signature,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`QRコード生成エラー: ${error.message}`);
    }

    return data;
  }

  // QRコード検証
  async validateQRCode(qrData: string): Promise<QRValidationResult> {
    try {
      const parsedData = JSON.parse(qrData);
      const { staffId, timestamp, signature } = parsedData;

      if (!staffId || !timestamp || !signature) {
        return {
          isValid: false,
          errorCode: "INVALID_FORMAT",
          errorMessage: "QRコードの形式が正しくありません",
        };
      }

      // 署名検証
      const expectedSignature = this.generateSignature(
        JSON.stringify({ staffId, timestamp })
      );
      if (signature !== expectedSignature) {
        return {
          isValid: false,
          errorCode: "INVALID_SIGNATURE",
          errorMessage: "QRコードが改ざんされている可能性があります",
        };
      }

      // 期限チェック
      const now = new Date();
      const expiresAt = new Date(timestamp + 60 * 60 * 1000); // 1時間後
      if (now > expiresAt) {
        return {
          isValid: false,
          errorCode: "EXPIRED",
          errorMessage: "QRコードの有効期限が切れています",
        };
      }

      // スタッフ存在確認
      const { data: staff, error } = await this.supabase
        .from("staffs")
        .select("id")
        .eq("id", staffId)
        .eq("is_active", true)
        .single();

      if (error || !staff) {
        return {
          isValid: false,
          errorCode: "STAFF_NOT_FOUND",
          errorMessage: "スタッフが見つかりません",
        };
      }

      return {
        isValid: true,
        staffId,
        expiresAt: expiresAt.toISOString(),
      };
    } catch {
      return {
        isValid: false,
        errorCode: "INVALID_FORMAT",
        errorMessage: "QRコードの読み取りに失敗しました",
      };
    }
  }

  // QRコード打刻
  async recordAttendance(
    request: QRAttendanceRequest
  ): Promise<QRAttendanceResponse> {
    try {
      // QRコード検証
      const validation = await this.validateQRCode(request.qrData);
      if (!validation.isValid) {
        await this.logAttendanceAttempt(
          request.qrData,
          request.action,
          false,
          validation.errorMessage || "Unknown error",
          request.locationData,
          request.deviceInfo
        );

        return {
          success: false,
          message: validation.errorMessage || "QRコードが無効です",
          timestamp: new Date().toISOString(),
          action: request.action,
          errorCode: validation.errorCode,
        };
      }

      const staffId = validation.staffId!;

      // 位置情報検証（設定されている場合）
      const locationCheck = await this.validateLocation(request.locationData);
      if (!locationCheck.isValid) {
        await this.logAttendanceAttempt(
          request.qrData,
          request.action,
          false,
          locationCheck.errorMessage || "Location error",
          request.locationData,
          request.deviceInfo,
          staffId
        );

        return {
          success: false,
          message: locationCheck.errorMessage || "位置情報が正しくありません",
          timestamp: new Date().toISOString(),
          action: request.action,
          errorCode: "LOCATION_ERROR",
        };
      }

      // 重複打刻チェック
      const duplicateCheck = await this.checkDuplicateAttendance(
        staffId,
        request.action
      );
      if (!duplicateCheck.isValid) {
        await this.logAttendanceAttempt(
          request.qrData,
          request.action,
          false,
          duplicateCheck.errorMessage || "Duplicate check error",
          request.locationData,
          request.deviceInfo,
          staffId
        );

        return {
          success: false,
          message: duplicateCheck.errorMessage || "重複した打刻です",
          timestamp: new Date().toISOString(),
          action: request.action,
          errorCode: "DUPLICATE_ATTENDANCE",
        };
      }

      // 勤怠記録を作成
      await this.createAttendanceRecord(staffId, request.action);

      // 成功ログを記録
      await this.logAttendanceAttempt(
        request.qrData,
        request.action,
        true,
        "打刻成功",
        request.locationData,
        request.deviceInfo,
        staffId
      );

      // スタッフ名を取得
      const { data: staff } = await this.supabase
        .from("staffs")
        .select("full_name")
        .eq("id", staffId)
        .single();

      return {
        success: true,
        message: "打刻が完了しました",
        timestamp: new Date().toISOString(),
        action: request.action,
        staffName: staff?.full_name,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "システムエラーが発生しました";

      await this.logAttendanceAttempt(
        request.qrData,
        request.action,
        false,
        errorMessage,
        request.locationData,
        request.deviceInfo
      );

      return {
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        action: request.action,
        errorCode: "SYSTEM_ERROR",
      };
    }
  }

  // QRコード統計取得
  async getQRCodeStats(): Promise<QRCodeStats> {
    const today = new Date().toISOString().split("T")[0];

    const [
      totalScansResult,
      successfulScansResult,
      activeQRCodesResult,
      todayScansResult,
    ] = await Promise.all([
      this.supabase
        .from("qr_attendance_logs")
        .select("id", { count: "exact", head: true }),
      this.supabase
        .from("qr_attendance_logs")
        .select("id", { count: "exact", head: true })
        .eq("success", true),
      this.supabase
        .from("qr_codes")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString()),
      this.supabase
        .from("qr_attendance_logs")
        .select("staff_id", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lt("created_at", `${today}T23:59:59.999Z`),
    ]);

    // ユニークユーザー数を取得
    const { data: uniqueUsersData } = await this.supabase
      .from("qr_attendance_logs")
      .select("staff_id")
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lt("created_at", `${today}T23:59:59.999Z`);

    const uniqueUsers = new Set(
      uniqueUsersData?.map((log) => log.staff_id) || []
    ).size;

    return {
      totalScans: totalScansResult.count || 0,
      successfulScans: successfulScansResult.count || 0,
      failedScans:
        (totalScansResult.count || 0) - (successfulScansResult.count || 0),
      activeQRCodes: activeQRCodesResult.count || 0,
      todayScans: todayScansResult.count || 0,
      monthlyScans: totalScansResult.count || 0, // For now, using total scans
      uniqueUsers,
      totalStaff: uniqueUsers, // For now, using unique users as staff count
    };
  }

  // QRコード履歴取得
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
      throw new Error(`QRコード履歴取得エラー: ${error.message}`);
    }

    return (data || []).map((log) => ({
      log,
      staff: log.staff,
      success: log.success,
      errorMessage: log.error_message,
    })) as QRAttendanceHistory[];
  }

  // スタッフQRコード情報取得
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
      throw new Error(`スタッフ情報取得エラー: ${staffResult.error.message}`);
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

  // 管理用データ取得
  async getManagementData(): Promise<QRManagementData> {
    const [stats, activeStaffs] = await Promise.all([
      this.getQRCodeStats(),
      this.getActiveStaffsWithQR(),
    ]);

    // Get staff QR codes with scan history
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

  // プライベートメソッド
  private generateQRData(staffId: string, expiresAt: Date): string {
    return JSON.stringify({
      staffId,
      timestamp: expiresAt.getTime(),
      version: "1.0",
    });
  }

  private generateSignature(data: string): string {
    // 本番環境では crypto.subtle.digest を使用
    const combined = data + this.getSecretKey();
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return hash.toString(16);
  }

  private async deactivateStaffQRCodes(staffId: string): Promise<void> {
    await this.supabase
      .from("qr_codes")
      .update({ is_active: false })
      .eq("staff_id", staffId)
      .eq("is_active", true);
  }

  private async validateLocation(locationData?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  }): Promise<{ isValid: boolean; errorMessage?: string }> {
    // 位置情報検証の設定を取得（実際の実装では設定テーブルから取得）
    const locationSettings: LocationSettings = {
      enabled: false, // デフォルトでは無効
      allowedRadius: 100, // 100m
      storeLatitude: 35.6762,
      storeLongitude: 139.6503,
      strictMode: false,
    };

    if (!locationSettings.enabled) {
      return { isValid: true };
    }

    if (!locationData?.latitude || !locationData?.longitude) {
      return {
        isValid: !locationSettings.strictMode,
        errorMessage: "位置情報が取得できませんでした",
      };
    }

    const distance = this.calculateDistance(
      locationData.latitude,
      locationData.longitude,
      locationSettings.storeLatitude,
      locationSettings.storeLongitude
    );

    if (distance > locationSettings.allowedRadius) {
      return {
        isValid: false,
        errorMessage: `店舗から${Math.round(distance)}m離れています（許可範囲: ${locationSettings.allowedRadius}m）`,
      };
    }

    return { isValid: true };
  }

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

  private async checkDuplicateAttendance(
    staffId: string,
    action: string
  ): Promise<{ isValid: boolean; errorMessage?: string }> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from("qr_attendance_logs")
      .select("id")
      .eq("staff_id", staffId)
      .eq("action_type", action)
      .eq("success", true)
      .gte("created_at", fiveMinutesAgo);

    if (error) {
      return { isValid: true }; // エラーの場合は通す
    }

    if (data && data.length > 0) {
      return {
        isValid: false,
        errorMessage: "5分以内に同じ操作が記録されています",
      };
    }

    return { isValid: true };
  }

  private async createAttendanceRecord(
    staffId: string,
    action: string
  ): Promise<void> {
    const today = new Date().toISOString().split("T")[0];

    // 既存の勤怠記録を取得または作成
    const { data: attendanceRecord, error } = await this.supabase
      .from("attendance_records")
      .select("*")
      .eq("staff_id", staffId)
      .eq("attendance_date", today)
      .single();

    const now = new Date().toTimeString().split(" ")[0]; // HH:MM:SS形式

    if (error && error.code === "PGRST116") {
      // 新規作成
      const insertData: Record<string, unknown> = {
        staff_id: staffId,
        attendance_date: today,
        status: "present",
      };

      if (action === "clock_in") {
        insertData.clock_in_time = now;
      }

      await this.supabase.from("attendance_records").insert(insertData);
    } else if (attendanceRecord) {
      // 更新
      const updateData: Record<string, unknown> = {};

      switch (action) {
        case "clock_in":
          updateData.clock_in_time = now;
          break;
        case "clock_out":
          updateData.clock_out_time = now;
          break;
        case "break_start":
          updateData.break_start_time = now;
          break;
        case "break_end":
          updateData.break_end_time = now;
          break;
      }

      await this.supabase
        .from("attendance_records")
        .update(updateData)
        .eq("id", attendanceRecord.id);
    }
  }

  private async logAttendanceAttempt(
    qrData: string,
    action: string,
    success: boolean,
    message: string,
    locationData?: { latitude?: number; longitude?: number; accuracy?: number },
    deviceInfo?: { userAgent?: string; platform?: string; language?: string },
    staffId?: string
  ): Promise<void> {
    // QRコードIDを取得（可能な場合）
    let qrCodeId: string | null = null;
    if (staffId) {
      const { data } = await this.supabase
        .from("qr_codes")
        .select("id")
        .eq("staff_id", staffId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      qrCodeId = data?.id || null;
    }

    await this.supabase.from("qr_attendance_logs").insert({
      staff_id: staffId || null,
      qr_code_id: qrCodeId,
      action_type: action as
        | "clock_in"
        | "clock_out"
        | "break_start"
        | "break_end",
      location_data: locationData || null,
      device_info: deviceInfo || null,
      success,
      error_message: success ? null : message,
    });
  }

  private async getActiveStaffsWithQR(): Promise<StaffQRInfo[]> {
    // スタッフ、QRコード、スキャン履歴を一度に取得
    const { data, error } = await this.supabase
      .from("staffs")
      .select(
        `
        *,
        qr_codes!inner (
          id,
          qr_data,
          signature,
          expires_at,
          created_at,
          is_active
        ),
        qr_attendance_logs (
          id,
          created_at,
          scan_type,
          location
        )
      `
      )
      .eq("is_active", true)
      .eq("qr_codes.is_active", true)
      .gt("qr_codes.expires_at", new Date().toISOString())
      .order("qr_attendance_logs.created_at", { ascending: false });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("アクティブスタッフ取得エラー:", error);
      }
      return [];
    }

    const result: StaffQRInfo[] = (data || []).map((staff) => {
      const qrCode = staff.qr_codes?.[0]; // 最初のQRコードを使用
      const scanHistory = staff.qr_attendance_logs || [];

      // Calculate today's scans
      const today = new Date().toISOString().split("T")[0];
      const todayScans = scanHistory.filter((log: { created_at: string }) =>
        log.created_at.startsWith(today)
      ).length;

      // Extract staff properties without the relation fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { qr_codes, qr_attendance_logs, ...staffData } = staff;

      return {
        staff: staffData,
        qrCode: qrCode
          ? {
              id: qrCode.id,
              staff_id: staff.id,
              qr_data: qrCode.qr_data,
              signature: qrCode.signature,
              expires_at: qrCode.expires_at,
              created_at: qrCode.created_at,
              is_active: qrCode.is_active,
            }
          : undefined,
        hasActiveQR: !!qrCode,
        lastGenerated: qrCode?.created_at,
        scanHistory: scanHistory,
        todayScans,
      };
    });

    return result;
  }

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
}

// Export singleton instance
export const qrCodeService = new QRCodeService();
