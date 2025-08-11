"use client";

import { Visit } from "@/types/customer.types";
import { useState } from "react";
import {
  ClockIcon,
  UsersIcon,
  CurrencyYenIcon,
} from "@heroicons/react/24/outline";
import { formatDateTime, formatCurrency } from "@/lib/utils/formatting";
import { billingService } from "@/services/billing.service";
import { Pagination, DateRangePicker } from "@/components/common";

type ExpandedDetails = {
  loading: boolean;
  orderItems?: Array<{
    id: number;
    name: string;
    quantity: number;
    totalPrice: number;
  }>;
  casts?: Array<{
    castId: string;
    name?: string;
    role?: string;
    nomination?: string;
    fee?: number;
  }>;
  error?: string;
};

interface VisitHistoryProps {
  visits: Visit[];
  total?: number; // server provided total
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (start?: string, end?: string) => void;
  isLoading?: boolean;
}

export function VisitHistory({
  visits,
  total: totalProp,
  page: pageProp,
  pageSize: pageSizeProp,
  onPageChange,
  onPageSizeChange,
  startDate,
  endDate,
  onDateRangeChange,
  isLoading = false,
}: VisitHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const controlled =
    typeof pageProp === "number" && typeof pageSizeProp === "number";
  const page = controlled ? pageProp! : 1;
  const pageSize = controlled ? pageSizeProp! : visits.length || 10;
  const total = typeof totalProp === "number" ? totalProp : visits.length;
  // totalPages kept for legacy scenarios; eslint-disable-next-line used to avoid lint error when not used
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  // Server-side pagination: assume `visits` already contains current page
  const pageVisits = controlled ? visits : visits.slice(startIdx, endIdx);
  const [detailsMap, setDetailsMap] = useState<Record<string, ExpandedDetails>>(
    {}
  );

  const loadDetails = async (visitId: string) => {
    setDetailsMap((prev) => ({ ...prev, [visitId]: { loading: true } }));
    try {
      const visit = await billingService.getVisitWithDetails(visitId);
      const orderItems = (visit?.orderItems || []).map((oi) => ({
        id: oi.id,
        name: oi.product?.name || String(oi.productId),
        quantity: oi.quantity,
        totalPrice: oi.totalPrice,
      }));

      const castSummaries = visit?.casts || [];

      setDetailsMap((prev) => ({
        ...prev,
        [visitId]: { loading: false, orderItems, casts: castSummaries },
      }));
    } catch (e) {
      setDetailsMap((prev) => ({
        ...prev,
        [visitId]: {
          loading: false,
          error: e instanceof Error ? e.message : "読み込みに失敗しました",
        },
      }));
    }
  };
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
      {/* Pagination header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 text-sm text-gray-600 gap-2">
        <div className="flex items-center gap-2">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => {
              onPageChange?.(p);
              setExpandedId(null);
            }}
            onPageSizeChange={(n) => {
              onPageSizeChange?.(n);
              setExpandedId(null);
            }}
          />
        </div>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={onDateRangeChange}
        />
      </div>
      <ul className="-mb-8">
        {pageVisits.map((visit, idx) => {
          const visitIdx = startIdx + idx;
          return (
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
                          onClick={() => {
                            setExpandedId((prev) =>
                              prev === visit.id ? null : visit.id
                            );
                            if (
                              expandedId !== visit.id &&
                              !detailsMap[visit.id]
                            ) {
                              void loadDetails(visit.id);
                            }
                          }}
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
                      <div className="font-medium mb-2">この来店の明細</div>
                      {detailsMap[visit.id]?.loading ? (
                        <div className="text-xs text-gray-500">
                          読み込み中...
                        </div>
                      ) : detailsMap[visit.id]?.error ? (
                        <div className="text-xs text-red-600">
                          {detailsMap[visit.id]?.error}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              指名・着席キャスト
                            </div>
                            <ul className="space-y-1">
                              {detailsMap[visit.id]?.casts &&
                              detailsMap[visit.id]!.casts!.length > 0 ? (
                                detailsMap[visit.id]!.casts!.map((c) => (
                                  <li
                                    key={c.castId}
                                    className="flex items-center justify-between"
                                  >
                                    <span>
                                      {c.name}{" "}
                                      {c.role && (
                                        <span className="text-gray-400">
                                          / {c.role}
                                        </span>
                                      )}
                                      {c.nomination && (
                                        <span className="ml-1 text-gray-400">
                                          ({c.nomination})
                                        </span>
                                      )}
                                    </span>
                                    {typeof c.fee === "number" && (
                                      <span className="text-gray-700">
                                        {formatCurrency(c.fee)}
                                      </span>
                                    )}
                                  </li>
                                ))
                              ) : (
                                <li className="text-xs text-gray-400">
                                  データなし
                                </li>
                              )}
                            </ul>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              注文明細
                            </div>
                            <ul className="space-y-1">
                              {detailsMap[visit.id]?.orderItems &&
                              detailsMap[visit.id]!.orderItems!.length > 0 ? (
                                detailsMap[visit.id]!.orderItems!.slice(
                                  0,
                                  5
                                ).map((oi) => (
                                  <li
                                    key={oi.id}
                                    className="flex items-center justify-between"
                                  >
                                    <span>
                                      {oi.name} × {oi.quantity}
                                    </span>
                                    <span className="text-gray-700">
                                      {formatCurrency(oi.totalPrice)}
                                    </span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-xs text-gray-400">
                                  データなし
                                </li>
                              )}
                            </ul>
                            {detailsMap[visit.id]?.orderItems &&
                              detailsMap[visit.id]!.orderItems!.length > 5 && (
                                <div className="text-[10px] text-gray-400 mt-1">
                                  他{" "}
                                  {detailsMap[visit.id]!.orderItems!.length - 5}{" "}
                                  件
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
