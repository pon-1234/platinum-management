"use client";

import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { tableService } from "@/services/table.service";
import TableDetailModal from "./TableDetailModal";
import dynamic from "next/dynamic";
const VisitSessionDrawer = dynamic(() => import("./VisitSessionDrawer"), {
  ssr: false,
});
import type { Table, TableStatus } from "@/types/reservation.types";
import {
  ArrowPathIcon as RefreshIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";

// Move getStatusConfig outside component for better performance
const getStatusConfig = (status: TableStatus) => {
  switch (status) {
    case "available":
      return {
        label: "利用可能",
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircleIcon,
        iconColor: "text-green-500",
      };
    case "occupied":
      return {
        label: "利用中",
        color: "bg-red-100 text-red-800 border-red-200",
        icon: UserGroupIcon,
        iconColor: "text-red-500",
      };
    case "reserved":
      return {
        label: "予約済み",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: ClockIcon,
        iconColor: "text-yellow-500",
      };
    case "cleaning":
      return {
        label: "清掃中",
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: RefreshIcon,
        iconColor: "text-blue-500",
      };
    default:
      return {
        label: "不明",
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: ExclamationCircleIcon,
        iconColor: "text-gray-500",
      };
  }
};

// Memoized table card component
interface TableCardProps {
  table: Table;
  onSelect?: (table: Table) => void;
  onStatusChange: (tableId: string, status: TableStatus) => void;
}

const TableCard = memo(
  ({ table, onSelect, onStatusChange }: TableCardProps) => {
    const config = getStatusConfig(table.currentStatus);

    return (
      <div
        className={`relative bg-white rounded-lg border-2 p-4 cursor-pointer hover:shadow-md transition-shadow ${config.color}`}
        onClick={() => onSelect?.(table)}
      >
        <div className="text-center">
          <config.icon className={`h-8 w-8 mx-auto mb-2 ${config.iconColor}`} />
          <h3 className="font-semibold text-lg">{table.tableName}</h3>
          <p className="text-sm opacity-75">{table.capacity}席</p>
          <p className="text-xs mt-2 font-medium">{config.label}</p>
        </div>

        {/* Quick Status Change Buttons */}
        <div className="absolute top-2 right-2">
          <div className="flex flex-col space-y-1">
            {table.currentStatus !== "available" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(table.id, "available");
                }}
                className="w-6 h-6 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center"
                title="利用可能にする"
              >
                <CheckCircleIcon className="w-4 h-4 text-white" />
              </button>
            )}
            {table.currentStatus !== "cleaning" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(table.id, "cleaning");
                }}
                className="w-6 h-6 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center"
                title="清掃中にする"
              >
                <RefreshIcon className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

TableCard.displayName = "TableCard";

interface RealTimeTableDashboardProps {
  onTableSelect?: (table: Table) => void;
}

export default function RealTimeTableDashboard({
  onTableSelect,
}: RealTimeTableDashboardProps) {
  const [tablesMap, setTablesMap] = useState<Map<string, Table>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("connecting");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showTableDetail, setShowTableDetail] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  // Convert Map to sorted array
  const tables = useMemo(() => {
    return Array.from(tablesMap.values()).sort((a, b) =>
      a.tableName.localeCompare(b.tableName)
    );
  }, [tablesMap]);

  // Real-time subscription
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let retryCount = 0;
    let retryTimeout: NodeJS.Timeout | null = null;
    const MAX_RETRY_COUNT = 5;
    const BASE_RETRY_DELAY = 1000; // 1 second

    const initializeRealTimeConnection = async () => {
      try {
        setConnectionStatus("connecting");

        unsubscribe = tableService.subscribeToTableUpdatesDifferential(
          // Handle single table update
          (updatedTable) => {
            setTablesMap((prev) => {
              const newMap = new Map(prev);
              newMap.set(updatedTable.id, updatedTable);
              return newMap;
            });
            setLastUpdated(new Date());
          },
          // Handle table deletion
          (tableId) => {
            setTablesMap((prev) => {
              const newMap = new Map(prev);
              newMap.delete(tableId);
              return newMap;
            });
            setLastUpdated(new Date());
          },
          // Handle initial load
          (allTables) => {
            const newMap = new Map(allTables.map((t) => [t.id, t]));
            setTablesMap(newMap);
            setLastUpdated(new Date());
            setConnectionStatus("connected");
            setIsLoading(false);
            // Reset retry count on successful connection
            retryCount = 0;
          }
        );
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to initialize real-time connection:", error);
        }
        handleConnectionError();
      }
    };

    // Handle connection errors with exponential backoff
    const handleConnectionError = () => {
      setConnectionStatus("disconnected");

      if (retryCount >= MAX_RETRY_COUNT) {
        toast.error(
          "リアルタイム接続を確立できませんでした。ページを更新してください。"
        );
        return;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, retryCount), 30000);
      retryCount++;

      toast.error(
        `リアルタイム接続が切断されました。${delay / 1000}秒後に再接続を試行します... (${retryCount}/${MAX_RETRY_COUNT})`
      );

      retryTimeout = setTimeout(() => {
        initializeRealTimeConnection();
      }, delay);
    };

    // Initial connection
    initializeRealTimeConnection();

    // Add error handling
    const handleBeforeUnload = () => {
      if (unsubscribe) unsubscribe();
      if (retryTimeout) clearTimeout(retryTimeout);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []); // Effect only runs once on mount - state setters are stable, no dependencies needed

  const handleStatusChange = useCallback(
    async (tableId: string, newStatus: TableStatus) => {
      try {
        await tableService.updateTableStatus(tableId, newStatus);
        toast.success("テーブルステータスを更新しました");
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to update table status:", error);
        }
        toast.error("ステータス更新に失敗しました");
      }
    },
    []
  );

  const handleTableSelect = useCallback(
    (table: Table) => {
      setSelectedTable(table);
      // Open only the operations drawer to avoid double overlays
      setShowTableDetail(false);
      setShowDrawer(true);
      onTableSelect?.(table);
    },
    [onTableSelect]
  );

  const statusCounts = useMemo(() => {
    return tables.reduce(
      (counts, table) => {
        counts[table.currentStatus] = (counts[table.currentStatus] || 0) + 1;
        return counts;
      },
      {} as Record<TableStatus, number>
    );
  }, [tables]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">テーブル情報を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Connection Status */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            リアルタイムテーブル状況
          </h2>
          <p className="text-sm text-gray-500">
            最終更新: {lastUpdated.toLocaleTimeString("ja-JP")}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className={`h-3 w-3 rounded-full ${
              connectionStatus === "connected"
                ? "bg-green-500"
                : connectionStatus === "connecting"
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-red-500"
            }`}
          />
          <span className="text-sm text-gray-600">
            {connectionStatus === "connected"
              ? "接続中"
              : connectionStatus === "connecting"
                ? "接続中..."
                : "切断"}
          </span>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries({
          available: "利用可能",
          occupied: "利用中",
          reserved: "予約済み",
          cleaning: "清掃中",
        }).map(([status, label]) => {
          const count = statusCounts[status as TableStatus] || 0;
          const config = getStatusConfig(status as TableStatus);

          return (
            <div key={status} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <config.icon className={`h-8 w-8 ${config.iconColor}`} />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">{label}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {count}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onSelect={handleTableSelect}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">状態説明</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {Object.entries({
            available: "利用可能 - 新しいお客様を案内できます",
            occupied: "利用中 - お客様が利用中です",
            reserved: "予約済み - 予約が入っています",
            cleaning: "清掃中 - テーブルを清掃中です",
          }).map(([status, description]) => {
            const config = getStatusConfig(status as TableStatus);
            return (
              <div key={status} className="flex items-start space-x-1">
                <config.icon className={`w-3 h-3 mt-0.5 ${config.iconColor}`} />
                <span className="text-gray-600">{description}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table Detail Modal */}
      <TableDetailModal
        isOpen={showTableDetail}
        onClose={() => setShowTableDetail(false)}
        table={selectedTable}
      />

      {/* Visit session drawer (operations unified) */}
      <VisitSessionDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        table={selectedTable}
      />
    </div>
  );
}
