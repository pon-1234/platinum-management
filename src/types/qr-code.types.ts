import type { Database } from "./database.types";

// データベース型のエイリアス
export type QRCode = Database["public"]["Tables"]["qr_codes"]["Row"];
export type CreateQRCodeData =
  Database["public"]["Tables"]["qr_codes"]["Insert"];
export type UpdateQRCodeData =
  Database["public"]["Tables"]["qr_codes"]["Update"];

export type QRAttendanceLog =
  Database["public"]["Tables"]["qr_attendance_logs"]["Row"];
export type CreateQRAttendanceLogData =
  Database["public"]["Tables"]["qr_attendance_logs"]["Insert"];

export type Staff = Database["public"]["Tables"]["staffs"]["Row"];

// QRコード打刻アクション
export type QRAttendanceAction =
  | "clock_in"
  | "clock_out"
  | "break_start"
  | "break_end";

// QRコード生成リクエスト
export interface GenerateQRCodeRequest {
  staffId: string;
  expiresIn?: number; // 有効期限（分）デフォルト: 60分
}

// QRコード読み取り結果
export interface QRScanResult {
  staffId: string;
  timestamp: number;
  signature: string;
  isValid: boolean;
  errorMessage?: string;
}

// QRコード打刻リクエスト
export interface QRAttendanceRequest {
  qrData: string;
  action: QRAttendanceAction;
  locationData?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    language?: string;
  };
}

// QRコード打刻レスポンス
export interface QRAttendanceResponse {
  success: boolean;
  message: string;
  timestamp: string;
  action: QRAttendanceAction;
  staffName?: string;
  errorCode?: string;
}

// QRコード統計
export interface QRCodeStats {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  activeQRCodes: number;
  todayScans: number;
  monthlyScans: number;
  uniqueUsers: number;
  totalStaff: number;
}

// 位置検証設定
export interface LocationSettings {
  enabled: boolean;
  allowedRadius: number; // メートル
  storeLatitude: number;
  storeLongitude: number;
  strictMode: boolean; // 厳密モード
}

// デバイス情報
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution?: string;
  timezone?: string;
}

// 位置情報
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

// QRスキャン履歴
export interface QRScanHistory {
  id: string;
  staffId: string;
  actionType: QRAttendanceAction;
  success: boolean;
  locationData?: LocationData;
  deviceInfo?: DeviceInfo;
  errorMessage?: string;
  createdAt: string;
  staff: {
    id: string;
    fullName: string;
  };
}

// QR管理データ
export interface QRManagementData {
  stats: QRCodeStats;
  staffQRCodes: {
    staffId: string;
    staffName: string;
    qrCode?: {
      id: string;
      expiresAt: string;
      isActive: boolean;
    };
    todayScans: number;
    lastScan?: QRScanHistory;
  }[];
}

// スタッフQR情報
export interface StaffQRInfo {
  staffId: string;
  staffName: string;
  qrCode?: QRCode;
  todayScans: number;
  lastScan?: QRScanHistory;
}

// QRコード履歴
export interface QRAttendanceHistory {
  log: QRAttendanceLog;
  staff: Staff;
  success: boolean;
  errorMessage?: string;
  distanceFromStore?: number;
}

// QRコード検証結果
export interface QRValidationResult {
  isValid: boolean;
  errorCode?:
    | "EXPIRED"
    | "INVALID_SIGNATURE"
    | "INVALID_FORMAT"
    | "STAFF_NOT_FOUND";
  errorMessage?: string;
  staffId?: string;
  expiresAt?: string;
}

// カメラアクセス設定
export interface CameraSettings {
  facingMode: "environment" | "user"; // 背面カメラ / 前面カメラ
  width?: number;
  height?: number;
  frameRate?: number;
}

// QRコードスキャナー設定
export interface QRScannerSettings {
  camera: CameraSettings;
  location: LocationSettings;
  autoStop: boolean; // 成功時に自動停止
  timeout: number; // タイムアウト（秒）
  beepOnSuccess: boolean;
  vibrationOnSuccess: boolean;
}

// QRコード表示設定
export interface QRDisplaySettings {
  size: number; // ピクセル
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
  margin: number;
  darkColor: string;
  lightColor: string;
}

// スタッフQRコード情報
export interface StaffQRInfo {
  staff: Staff;
  qrCode?: QRCode;
  hasActiveQR: boolean;
  lastGenerated?: string;
  scanHistory: QRAttendanceLog[];
  todayScans: number;
}

// QRコード管理ダッシュボード用データ
export interface QRManagementData {
  stats: QRCodeStats;
  recentLogs: QRAttendanceHistory[];
  activeQRCodes: StaffQRInfo[];
  failedAttempts: QRAttendanceHistory[];
}

// QRコード設定
export interface QRCodeSettings {
  defaultExpiryMinutes: number;
  maxActiveQRCodes: number;
  locationValidation: LocationSettings;
  allowedDevices: string[];
  securityLevel: "low" | "medium" | "high";
  autoRefresh: boolean;
  refreshInterval: number; // 分
}
