/**
 * QRコードサービスのエントリーポイント
 *
 * 各サービスの役割:
 * - QRGenerationService: QRコード生成・検証
 * - QRAttendanceService: 出勤記録・履歴管理
 * - QRStatisticsService: 統計・分析・レポート
 * - QRManagementService: 管理・設定・スタッフ情報
 */

export {
  QRGenerationService,
  qrGenerationService,
} from "./qr-generation.service";
export {
  QRAttendanceService,
  qrAttendanceService,
} from "./qr-attendance.service";
export {
  QRStatisticsService,
  qrStatisticsService,
} from "./qr-statistics.service";
export {
  QRManagementService,
  qrManagementService,
} from "./qr-management.service";

/**
 * 統合QRCodeServiceクラス - 後方互換性のため
 * 既存のコードが動作するよう、従来のインターフェースを提供
 */
export class QRCodeService {
  private generationService = qrGenerationService;
  private attendanceService = qrAttendanceService;
  private statisticsService = qrStatisticsService;
  private managementService = qrManagementService;

  // QR生成・検証
  async generateQRCode(
    request: import("@/types/qr-code.types").GenerateQRCodeRequest
  ) {
    return this.generationService.generateQRCode(request);
  }

  async validateQRCode(qrData: string) {
    return this.generationService.validateQRCode(qrData);
  }

  // 出勤記録
  async recordAttendance(
    request: import("@/types/qr-code.types").QRAttendanceRequest
  ) {
    return this.attendanceService.recordAttendance(request);
  }

  async getQRAttendanceHistory(params: {
    staffId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    return this.attendanceService.getQRAttendanceHistory(params);
  }

  // 統計・分析
  async getQRCodeStats() {
    return this.statisticsService.getQRCodeStats();
  }

  // 管理・設定
  async getStaffQRInfo(staffId: string) {
    return this.managementService.getStaffQRInfo(staffId);
  }

  async getManagementData() {
    return this.managementService.getManagementData();
  }

  async getScanHistory(params: { staffId?: string; limit?: number }) {
    return this.managementService.getScanHistory(params);
  }
}

// 既存コード用のシングルトンインスタンス
export const qrCodeService = new QRCodeService();
