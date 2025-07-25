"use client";

import { useState, useEffect } from "react";
import { complianceService } from "@/services/compliance.service";

export function ComplianceDashboard() {
  const [stats, setStats] = useState({
    verifications: {
      total: 0,
      verified: 0,
      pending: 0,
      byType: {} as Record<string, number>,
    },
    reports: {
      total: 0,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await complianceService.getComplianceStats();
      setStats(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getIdTypeName = (type: string) => {
    switch (type) {
      case "license":
        return "運転免許証";
      case "passport":
        return "パスポート";
      case "mynumber":
        return "マイナンバーカード";
      case "residence_card":
        return "在留カード";
      default:
        return type;
    }
  };

  const getReportTypeName = (type: string) => {
    switch (type) {
      case "employee_list":
        return "従業者名簿";
      case "complaint_log":
        return "苦情処理簿";
      case "business_report":
        return "営業報告書";
      case "tax_report":
        return "税務申告書";
      default:
        return type;
    }
  };

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        法令遵守ダッシュボード
      </h2>

      {/* 身分証確認統計 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">身分証確認状況</h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.verifications.total}
            </div>
            <div className="text-sm text-gray-600">総確認数</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.verifications.verified}
            </div>
            <div className="text-sm text-gray-600">確認済み</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.verifications.pending}
            </div>
            <div className="text-sm text-gray-600">未確認</div>
          </div>
        </div>

        <h4 className="text-sm font-medium text-gray-700 mb-2">身分証種類別</h4>
        <div className="space-y-2">
          {Object.entries(stats.verifications.byType).map(([type, count]) => (
            <div key={type} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {getIdTypeName(type)}
              </span>
              <span className="text-sm font-medium">{count}件</span>
            </div>
          ))}
        </div>
      </div>

      {/* レポート生成統計 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">法定帳簿生成状況</h3>
        <div className="mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.reports.total}
            </div>
            <div className="text-sm text-gray-600">総レポート数</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">種類別</h4>
            <div className="space-y-2">
              {Object.entries(stats.reports.byType).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {getReportTypeName(type)}
                  </span>
                  <span className="text-sm font-medium">{count}件</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">状態別</h4>
            <div className="space-y-2">
              {Object.entries(stats.reports.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {status === "generated" && "生成済み"}
                    {status === "submitted" && "提出済み"}
                    {status === "approved" && "承認済み"}
                  </span>
                  <span className="text-sm font-medium">{count}件</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 法令遵守チェックリスト */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">法令遵守チェックリスト</h3>
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              disabled
              checked
            />
            <span className="text-sm text-gray-700">
              身分証確認システム導入済み
            </span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              disabled
              checked
            />
            <span className="text-sm text-gray-700">
              従業者名簿の自動生成機能
            </span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              disabled
              checked
            />
            <span className="text-sm text-gray-700">苦情処理簿の管理機能</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              disabled
              checked
            />
            <span className="text-sm text-gray-700">年齢確認記録の保管</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              disabled
              checked
            />
            <span className="text-sm text-gray-700">営業時間の管理</span>
          </label>
        </div>
      </div>
    </div>
  );
}
