"use client";

import { Visit } from "@/types/customer.types";
import { useState } from "react";
import {
  ClockIcon,
  UsersIcon,
  CurrencyYenIcon,
} from "@heroicons/react/24/outline";
import { formatDateTime, formatCurrency } from "@/lib/utils/formatting";

interface VisitHistoryProps {
  visits: Visit[];
  isLoading?: boolean;
}

export function VisitHistory({ visits, isLoading = false }: VisitHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const formatDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "滞在中";

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}時間${minutes}分`;
  };

  const formatAmount = (amount: number | null) => {
    if (amount === null) return "-";
    return formatCurrency(amount);
  };

  const getStatusBadge = (status: Visit["status"]) => {
    const statusConfig = {
      active: { label: "滞在中", className: "bg-green-100 text-green-800" },
      completed: { label: "完了", className: "bg-gray-100 text-gray-800" },
      cancelled: { label: "キャンセル", className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status];
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-500">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">来店履歴がありません</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {visits.map((visit, visitIdx) => (
          <li key={visit.id}>
            <div className="relative pb-8">
              {visitIdx !== visits.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
                    <ClockIcon
                      className="h-5 w-5 text-white"
                      aria-hidden="true"
                    />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-gray-900">
                        テーブル {visit.tableId}
                      </p>
                      {getStatusBadge(visit.status)}
                    </div>
                    <div className="mt-2 flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{formatDateTime(visit.checkInAt)}</span>
                        {visit.checkOutAt && (
                          <>
                            <span>〜</span>
                            <span>{formatDateTime(visit.checkOutAt)}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <UsersIcon className="h-4 w-4" />
                        <span>{visit.numGuests}名</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1 text-gray-700">
                        <span className="font-medium">滞在時間:</span>
                        <span>
                          {formatDuration(visit.checkInAt, visit.checkOutAt)}
                        </span>
                      </div>
                      {visit.totalAmount !== null && (
                        <div className="flex items-center gap-1 text-gray-700">
                          <CurrencyYenIcon className="h-4 w-4" />
                          <span className="font-medium">
                            {formatAmount(visit.totalAmount)}
                          </span>
                        </div>
                      )}
                      <button
                        className="text-indigo-600 hover:text-indigo-700 text-xs"
                        onClick={() =>
                          setExpandedId((prev) =>
                            prev === visit.id ? null : visit.id
                          )
                        }
                      >
                        {expandedId === visit.id ? "閉じる" : "詳細"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {expandedId === visit.id && (
                <div className="ml-12 mt-2 text-sm text-gray-700">
                  <div className="border rounded p-3 bg-gray-50">
                    <div className="font-medium mb-1">この来店の明細</div>
                    <div className="text-xs text-gray-500">
                      ※
                      詳細な注文・指名は「会計」画面や席のドロワーから確認/操作できます
                    </div>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
