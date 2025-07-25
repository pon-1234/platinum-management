"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { complianceService } from "@/services/compliance.service";
import { ReportType, ReportStatus } from "@/types/compliance.types";

interface ComplianceReportData {
  id: string;
  reportType: string;
  generatedBy: string;
  filePath: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  status: string;
  notes: string | null;
  generatedAt: string;
  generatedStaff: {
    id: string;
    fullName: string;
  };
}

export function ComplianceReportList() {
  const [reports, setReports] = useState<ComplianceReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    reportType: "" as ReportType | "",
    status: "" as ReportStatus | "",
  });

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await complianceService.searchComplianceReports({
        reportType: filter.reportType || undefined,
        status: filter.status || undefined,
      });
      setReports(data as unknown as ComplianceReportData[]);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
      alert("データの取得に失敗しました");
    } finally {
      setLoading(false);
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

  const getStatusName = (status: string) => {
    switch (status) {
      case "generated":
        return "生成済み";
      case "submitted":
        return "提出済み";
      case "approved":
        return "承認済み";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "generated":
        return "bg-gray-100 text-gray-800";
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleGenerateReport = async (type: ReportType) => {
    const periodStart = prompt("開始日を入力してください (YYYY-MM-DD)");
    const periodEnd = prompt("終了日を入力してください (YYYY-MM-DD)");

    if (!periodStart || !periodEnd) return;

    try {
      if (type === "employee_list") {
        await complianceService.generateEmployeeList(
          new Date(periodStart),
          new Date(periodEnd)
        );
      } else if (type === "complaint_log") {
        await complianceService.generateComplaintLog(
          new Date(periodStart),
          new Date(periodEnd)
        );
      }
      alert("レポートを生成しました");
      loadReports();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error(error);
      }
      alert("レポートの生成に失敗しました");
    }
  };

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <select
            value={filter.reportType}
            onChange={(e) =>
              setFilter({
                ...filter,
                reportType: e.target.value as ReportType | "",
              })
            }
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">すべての種類</option>
            <option value="employee_list">従業者名簿</option>
            <option value="complaint_log">苦情処理簿</option>
            <option value="business_report">営業報告書</option>
            <option value="tax_report">税務申告書</option>
          </select>

          <select
            value={filter.status}
            onChange={(e) =>
              setFilter({
                ...filter,
                status: e.target.value as ReportStatus | "",
              })
            }
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">すべての状態</option>
            <option value="generated">生成済み</option>
            <option value="submitted">提出済み</option>
            <option value="approved">承認済み</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleGenerateReport("employee_list")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            従業者名簿を生成
          </button>
          <button
            onClick={() => handleGenerateReport("complaint_log")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            苦情処理簿を生成
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                生成日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                レポート種類
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                対象期間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                生成者
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(report.generatedAt), "yyyy/MM/dd HH:mm", {
                    locale: ja,
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getReportTypeName(report.reportType)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.periodStart && report.periodEnd ? (
                    <>
                      {format(new Date(report.periodStart), "yyyy/MM/dd", {
                        locale: ja,
                      })}
                      {" 〜 "}
                      {format(new Date(report.periodEnd), "yyyy/MM/dd", {
                        locale: ja,
                      })}
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}
                  >
                    {getStatusName(report.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.generatedStaff?.fullName || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {report.filePath ? (
                    <a
                      href={report.filePath}
                      download
                      className="text-blue-600 hover:text-blue-900"
                    >
                      ダウンロード
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reports.length === 0 && (
        <div className="text-center py-8 text-gray-500">データがありません</div>
      )}
    </div>
  );
}
