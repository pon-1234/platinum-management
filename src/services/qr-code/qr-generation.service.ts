import { BaseService } from "@/services/base.service";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createHmac } from "crypto";
import type {
  GenerateQRCodeRequest,
  QRValidationResult,
} from "@/types/qr-code.types";

/**
 * QRコード生成・検証専用サービス
 * 責任: QRコードの生成、署名、検証
 */
export class QRGenerationService extends BaseService {
  private supabase: SupabaseClient<Database>;
  private readonly secretKey =
    process.env.QR_CODE_SECRET_KEY ||
    (() => {
      throw new Error(
        "QR_CODE_SECRET_KEY environment variable is required for security"
      );
    })();

  constructor() {
    super();
    this.supabase = createClient();
  }

  /**
   * QRコードを生成
   */
  async generateQRCode(request: GenerateQRCodeRequest) {
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
      this.handleError(error, "QRコードの生成に失敗しました");
    }

    return data;
  }

  /**
   * QRコードを検証
   */
  async validateQRCode(qrData: string): Promise<QRValidationResult> {
    try {
      JSON.parse(Buffer.from(qrData, "base64").toString("utf-8")); // QRコードの形式検証

      const { data: qrCode, error } = await this.supabase
        .from("qr_codes")
        .select("*")
        .eq("qr_data", qrData)
        .eq("is_active", true)
        .single();

      if (error || !qrCode) {
        return {
          isValid: false,
          errorMessage: "QRコードが見つからないか、無効です",
        };
      }

      // 有効期限チェック
      if (new Date() > new Date(qrCode.expires_at)) {
        // 期限切れのQRコードを無効化
        await this.supabase
          .from("qr_codes")
          .update({ is_active: false })
          .eq("id", qrCode.id);

        return {
          isValid: false,
          errorMessage: "QRコードの有効期限が切れています",
        };
      }

      // 署名検証
      const expectedSignature = this.generateSignature(qrData);
      if (qrCode.signature !== expectedSignature) {
        return {
          isValid: false,
          errorMessage: "QRコードの署名が無効です",
        };
      }

      // スタッフ情報を取得
      const { data: staff, error: staffError } = await this.supabase
        .from("staffs")
        .select("id, full_name, role, is_active")
        .eq("id", qrCode.staff_id)
        .single();

      if (staffError || !staff || !staff.is_active) {
        return {
          isValid: false,
          errorMessage: "スタッフ情報が見つからないか、非アクティブです",
        };
      }

      return {
        isValid: true,
        staffId: staff.id,
        expiresAt: qrCode.expires_at,
      };
    } catch {
      return {
        isValid: false,
        errorMessage: "QRコードの形式が無効です",
      };
    }
  }

  /**
   * スタッフの既存QRコードを無効化
   */
  private async deactivateStaffQRCodes(staffId: string): Promise<void> {
    await this.supabase
      .from("qr_codes")
      .update({ is_active: false })
      .eq("staff_id", staffId)
      .eq("is_active", true);
  }

  /**
   * QRコードデータを生成
   */
  private generateQRData(staffId: string, expiresAt: Date): string {
    const qrCodeData = {
      staffId,
      timestamp: Date.now(),
      expiresAt: expiresAt.toISOString(),
      version: "1.0",
    };
    return Buffer.from(JSON.stringify(qrCodeData)).toString("base64");
  }

  /**
   * 署名を生成（簡易版）
   */
  private generateSignature(qrData: string): string {
    return createHmac("sha256", this.secretKey).update(qrData).digest("hex");
  }
}

export const qrGenerationService = new QRGenerationService();
