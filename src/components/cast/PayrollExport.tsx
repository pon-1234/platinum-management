"use client";

import { useState } from "react";
import { Calendar, Download, Users } from "lucide-react";
import { CastService } from "@/services/cast.service";
import {
  exportCastCompensationToCSV,
  formatDateRange,
} from "@/lib/utils/export";
import type { Cast } from "@/types/cast.types";

interface PayrollExportProps {
  casts: Cast[];
}

export function PayrollExport({ casts }: PayrollExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCasts, setSelectedCasts] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const castService = new CastService();

  const handleSelectAll = () => {
    if (selectedCasts.length === casts.length) {
      setSelectedCasts([]);
    } else {
      setSelectedCasts(casts.map((cast) => cast.staffId));
    }
  };

  const handleExport = async () => {
    if (selectedCasts.length === 0) {
      alert("エクスポートするキャストを選択してください");
      return;
    }

    setIsExporting(true);
    try {
      const compensations =
        await castService.calculateMultipleCastsCompensation(
          selectedCasts,
          dateRange.startDate,
          dateRange.endDate
        );

      const period = formatDateRange(dateRange.startDate, dateRange.endDate);
      const compensationsWithPeriod = compensations.map((comp) => ({
        ...comp,
        period,
      }));

      exportCastCompensationToCSV(
        compensationsWithPeriod,
        `給与データ_${dateRange.startDate}_${dateRange.endDate}.csv`
      );
    } catch (error) {
      console.error("Export failed:", error);
      alert("エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        給与データエクスポート
      </h2>

      {/* Date Range Selection */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
          <Calendar className="w-4 h-4 mr-1" />
          期間選択
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="start-date"
              className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
            >
              開始日
            </label>
            <input
              type="date"
              id="start-date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label
              htmlFor="end-date"
              className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
            >
              終了日
            </label>
            <input
              type="date"
              id="end-date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Cast Selection */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            <Users className="w-4 h-4 mr-1" />
            キャスト選択
          </h3>
          <button
            onClick={handleSelectAll}
            className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            {selectedCasts.length === casts.length
              ? "選択を解除"
              : "すべて選択"}
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3">
          {casts.map((cast) => (
            <label
              key={cast.staffId}
              className="flex items-center py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedCasts.includes(cast.staffId)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCasts([...selectedCasts, cast.staffId]);
                  } else {
                    setSelectedCasts(
                      selectedCasts.filter((id) => id !== cast.staffId)
                    );
                  }
                }}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                {cast.nickname}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={isExporting || selectedCasts.length === 0}
          className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "エクスポート中..." : "CSVダウンロード"}
        </button>
      </div>

      {selectedCasts.length > 0 && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-right">
          {selectedCasts.length}名のキャストを選択中
        </p>
      )}
    </div>
  );
}
