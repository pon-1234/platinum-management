"use client";

import { useState, useEffect } from "react";
import { qrCodeService } from "@/services/qr-code.service";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { QRManagementData, QRScanHistory } from "@/types/qr-code.types";

export function QRAttendanceDashboard() {
  const [managementData, setManagementData] = useState<QRManagementData | null>(
    null
  );
  const [scanHistory, setScanHistory] = useState<QRScanHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaffId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mgmtData, history] = await Promise.all([
        qrCodeService.getManagementData(),
        selectedStaffId
          ? qrCodeService.getScanHistory({ staffId: selectedStaffId })
          : qrCodeService.getScanHistory({ limit: 20 }),
      ]);

      setManagementData(mgmtData);
      setScanHistory(history);
    } catch (error) {
      console.error("データ読み込みエラー:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case "clock_in":
        return "出勤";
      case "clock_out":
        return "退勤";
      case "break_start":
        return "休憩開始";
      case "break_end":
        return "休憩終了";
      default:
        return actionType;
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case "clock_in":
        return "bg-green-100 text-green-800";
      case "clock_out":
        return "bg-red-100 text-red-800";
      case "break_start":
        return "bg-yellow-100 text-yellow-800";
      case "break_end":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計情報 */}
      {managementData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">
              {managementData.stats.totalStaff}
            </div>
            <div className="text-sm text-gray-600">登録スタッフ数</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">
              {managementData.stats.activeQRCodes}
            </div>
            <div className="text-sm text-gray-600">有効なQRコード</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-yellow-600">
              {managementData.stats.todayScans}
            </div>
            <div className="text-sm text-gray-600">本日のスキャン数</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-purple-600">
              {managementData.stats.monthlyScans}
            </div>
            <div className="text-sm text-gray-600">今月のスキャン数</div>
          </div>
        </div>
      )}

      {/* スタッフQRコード一覧 */}
      {managementData && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              スタッフ別QRコード状況
            </h3>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">全スタッフ</option>
                {managementData.staffQRCodes.map((staff) => (
                  <option key={staff.staffId} value={staff.staffId}>
                    {staff.staffName}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      スタッフ名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QRコード状態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      有効期限
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      本日スキャン
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      最終打刻
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {managementData.staffQRCodes
                    .filter(
                      (staff) =>
                        !selectedStaffId || staff.staffId === selectedStaffId
                    )
                    .map((staff) => (
                      <tr key={staff.staffId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {staff.staffName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {staff.qrCode ? (
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                staff.qrCode.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {staff.qrCode.is_active ? "有効" : "無効"}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">
                              未生成
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {staff.qrCode
                            ? format(
                                new Date(staff.qrCode.expires_at),
                                "MM/dd HH:mm",
                                { locale: ja }
                              )
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {staff.todayScans}回
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {staff.lastScan
                            ? format(
                                new Date(staff.lastScan.created_at),
                                "HH:mm",
                                { locale: ja }
                              )
                            : "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* スキャン履歴 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">スキャン履歴</h3>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    時刻
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    スタッフ名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    位置情報
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scanHistory.map((scan) => (
                  <tr key={scan.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(scan.createdAt), "MM/dd HH:mm:ss", {
                        locale: ja,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {scan.staff.fullName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getActionTypeColor(
                          scan.actionType
                        )}`}
                      >
                        {getActionTypeLabel(scan.actionType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {scan.success ? (
                        <span className="text-green-600">✓ 成功</span>
                      ) : (
                        <span className="text-red-600">✗ 失敗</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {scan.locationData ? "取得済み" : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {scanHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              スキャン履歴がありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
