"use client";

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
