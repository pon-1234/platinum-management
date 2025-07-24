"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/common";
import {
  generateQRCode,
  validateQRCode,
  recordAttendance,
  getAttendanceHistory,
  getCurrentAttendanceStatus,
  getQRCodeStats,
  type GenerateQRCodeInput,
  type RecordAttendanceInput,
  type GetAttendanceHistoryInput,
} from "@/app/actions/qr-code.actions";
import type {
  QRCode,
  QRCodeStats,
  QRAttendanceHistory,
} from "@/types/qr-code.types";
import {
  QrCodeIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

type ViewMode = "dashboard" | "generate" | "scan" | "history";

export default function QRAttendancePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<QRCodeStats | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<
    QRAttendanceHistory[]
  >([]);
  const [currentQRCode, setCurrentQRCode] = useState<QRCode | null>(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsResult, historyResult] = await Promise.all([
        getQRCodeStats({}),
        getAttendanceHistory({ limit: 10 }),
      ]);

      if (statsResult.success) {
        setStats(statsResult.data);
      }
      if (historyResult.success) {
        setAttendanceHistory(historyResult.data);
      }
    } catch (error) {
      toast.error("データの取得に失敗しました");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQRCode = async (data: GenerateQRCodeInput) => {
    try {
      setIsLoading(true);
      const result = await generateQRCode(data);

      if (result.success) {
        setCurrentQRCode(result.data);
        toast.success("QRコードを生成しました");
      } else {
        toast.error("QRコードの生成に失敗しました");
      }
    } catch (error) {
      toast.error("エラーが発生しました");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <QrCodeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                アクティブQRコード
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.activeQRCodes || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">本日の出勤</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.todayCheckIns || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                勤務中スタッフ
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.currentlyWorking || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">月間利用回数</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.monthlyUsage || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 最近の勤怠履歴 */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">最近の勤怠履歴</h3>
        </div>
        <div className="px-6 py-4">
          {attendanceHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">履歴がありません</p>
          ) : (
            <div className="space-y-3">
              {attendanceHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {record.staffName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(record.recordedAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.action === "check_in"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {record.action === "check_in" ? "出勤" : "退勤"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  if (isLoading && viewMode === "dashboard") {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QRコード勤怠管理</h1>
          <p className="text-gray-600">QRコードを使用した勤怠管理システム</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => handleGenerateQRCode({ staffId: "staff001" })}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            QRコード生成
          </button>
        </div>
      </div>

      {/* Content */}
      {renderDashboard()}

      {/* Current QR Code Display */}
      {currentQRCode && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            生成されたQRコード
          </h3>
          <div className="text-sm text-gray-600">
            <p>QRコードID: {currentQRCode.id}</p>
            <p>
              有効期限:{" "}
              {new Date(currentQRCode.expires_at).toLocaleString("ja-JP")}
            </p>
            <p>スタッフID: {currentQRCode.staff_id}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { staffService } from "@/services/staff.service";
import {
  QRCodeGenerator,
  QRCodeScanner,
  QRAttendanceDashboard,
} from "@/components/qr-code";
import { toast } from "react-hot-toast";
import { usePermission } from "@/hooks/usePermission";

type TabType = "generate" | "scan" | "dashboard";

export default function QRAttendancePage() {
  const [activeTab, setActiveTab] = useState<TabType>("generate");
  const [staffInfo, setStaffInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const { user } = useAuthStore();
  const { can } = usePermission();
  const canViewAttendance = can("attendance", "view");

  useEffect(() => {
    if (canViewAttendance) {
      loadStaffInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canViewAttendance]);

  const loadStaffInfo = async () => {
    if (!user) return;

    try {
      // Load the first page of staff data
      const result = await staffService.getAllStaff(1, 100);
      const staffs = result.data;
      const userStaff = staffs.find((s) => s.userId === user.id);

      if (userStaff) {
        setStaffInfo({
          id: userStaff.id,
          name: userStaff.fullName,
        });
      }
    } catch (error) {
      console.error("スタッフ情報の取得に失敗しました:", error);
    }
  };

  const handleScanSuccess = (result: { actionType: string }) => {
    toast.success(`打刻が完了しました: ${result.actionType}`);
    setActiveTab("dashboard");
  };

  const handleScanError = (error: string) => {
    toast.error(`エラー: ${error}`);
  };

  // 権限がない場合のメッセージ
  if (!canViewAttendance) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          アクセス権限がありません
        </h1>
        <p className="text-gray-600">勤怠情報を表示する権限がありません。</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">QRコード勤怠管理</h1>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("generate")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "generate"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            QRコード生成
          </button>
          <button
            onClick={() => setActiveTab("scan")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "scan"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            QRコードスキャン
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "dashboard"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            管理ダッシュボード
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === "generate" && staffInfo && (
          <div className="max-w-2xl mx-auto">
            <QRCodeGenerator
              staffId={staffInfo.id}
              staffName={staffInfo.name}
              autoRefresh={true}
            />

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                使用方法
              </h4>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                <li>上記のQRコードを印刷またはスマートフォンに保存します</li>
                <li>出勤・退勤時に店舗のQRコードスキャナーで読み取ります</li>
                <li>QRコードは定期的に自動更新されます</li>
                <li>
                  セキュリティのため、QRコードは他人と共有しないでください
                </li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === "scan" && (
          <div className="max-w-2xl mx-auto">
            <QRCodeScanner
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
            />

            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                注意事項
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>カメラへのアクセス許可が必要です</li>
                <li>QRコードを枠内に収めてください</li>
                <li>明るい場所でスキャンしてください</li>
                <li>店舗内でのみ打刻が有効です（位置情報確認）</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "dashboard" && <QRAttendanceDashboard />}
      </div>
    </div>
  );
}
