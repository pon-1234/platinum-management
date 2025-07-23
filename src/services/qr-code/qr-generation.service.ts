import { BaseService } from "../base.service";
import type {
  QRCode,
  GenerateQRCodeRequest,
  QRValidationResult,
} from "@/types/qr-code.types";

/**
 * QRコード生成・検証専用サービス
 * 責任: QRコードの生成、署名、検証
 */
export class QRGenerationService extends BaseService {
  private readonly secretKey = "PLATINUM_QR_SECRET_2024"; // 本番では環境変数から取得

  constructor() {
    super();
  }

  /**
   * QRコードを生成
   */
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
      this.handleError(error, "QRコードの生成に失敗しました");
    }

    return this.mapToQRCode(data);
  }

  /**
   * QRコードを検証
   */
  async validateQRCode(qrData: string): Promise<QRValidationResult> {
    try {
      const decoded = JSON.parse(
        Buffer.from(qrData, "base64").toString("utf-8")
      );

      const { data: qrCode, error } = await this.supabase
        .from("qr_codes")
        .select("*")
        .eq("qr_data", qrData)
        .eq("is_active", true)
        .single();

      if (error || !qrCode) {
        return {
          isValid: false,
          error: "QRコードが見つからないか、無効です",
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
          error: "QRコードの有効期限が切れています",
        };
      }

      // 署名検証
      const expectedSignature = this.generateSignature(qrData);
      if (qrCode.signature !== expectedSignature) {
        return {
          isValid: false,
          error: "QRコードの署名が無効です",
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
          error: "スタッフ情報が見つからないか、非アクティブです",
        };
      }

      return {
        isValid: true,
        qrCode: this.mapToQRCode(qrCode),
        staffInfo: {
          id: staff.id,
          fullName: staff.full_name,
          role: staff.role,
        },
        qrData: decoded,
      };
    } catch (error) {
      return {
        isValid: false,
        error: "QRコードの形式が無効です",
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
    const crypto = require("crypto");
    return crypto
      .createHmac("sha256", this.secretKey)
      .update(qrData)
      .digest("hex");
  }

  /**
   * データベースレコードをQRCodeオブジェクトにマップ
   */
  private mapToQRCode(data: any): QRCode {
    return {
      id: data.id,
      staffId: data.staff_id,
      qrData: data.qr_data,
      signature: data.signature,
      expiresAt: data.expires_at,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  }
}

export const qrGenerationService = new QRGenerationService();
