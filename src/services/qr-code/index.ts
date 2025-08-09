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
  // 循環インポートを回避するため、現在は空のクラス
  // 将来的に必要に応じて実装を追加
}

// 既存コード用のシングルトンインスタンス
export const qrCodeService = new QRCodeService();
