"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TableService } from "@/services/table.service";
import type { Table } from "@/types/reservation.types";

interface TableLayoutProps {
  onTableSelect?: (table: Table) => void;
  selectedTableId?: string;
  showStatus?: boolean;
}

const TABLE_STATUS_COLORS = {
  available: "bg-green-100 hover:bg-green-200 text-green-800 border-green-300",
  reserved:
    "bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300",
  occupied: "bg-red-100 hover:bg-red-200 text-red-800 border-red-300",
  cleaning: "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300",
} as const;

const TABLE_STATUS_LABELS = {
  available: "空席",
  reserved: "予約",
  occupied: "使用中",
  cleaning: "清掃中",
} as const;

export function TableLayout({
  onTableSelect,
  selectedTableId,
  showStatus = true,
}: TableLayoutProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const tableService = new TableService();

  useEffect(() => {
    loadTables();

    // Subscribe to real-time updates
    const unsubscribe = tableService.subscribeToAllTableUpdates(
      (updatedTables) => {
        setTables(updatedTables);
      }
    );

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTables = async () => {
    try {
      const data = await tableService.searchTables({ isActive: true });
      setTables(data);
    } catch (error) {
      console.error("Failed to load tables:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableClick = (table: Table) => {
    if (onTableSelect) {
      onTableSelect(table);
    }
  };

  // Group tables by location for organized display
  const tablesByLocation = tables.reduce(
    (acc, table) => {
      const location = table.location || "その他";
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(table);
      return acc;
    },
    {} as Record<string, Table[]>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status Legend */}
      {showStatus && (
        <div className="flex flex-wrap gap-4 justify-center">
          {Object.entries(TABLE_STATUS_LABELS).map(([status, label]) => (
            <div key={status} className="flex items-center space-x-2">
              <div
                className={cn(
                  "w-4 h-4 rounded-sm border",
                  TABLE_STATUS_COLORS[
                    status as keyof typeof TABLE_STATUS_COLORS
                  ]
                )}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Table Layout by Location */}
      {Object.entries(tablesByLocation).map(([location, locationTables]) => (
        <div key={location} className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {location}
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {locationTables.map((table) => (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                disabled={table.currentStatus === "cleaning"}
                className={cn(
                  "relative p-4 rounded-lg border-2 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                  TABLE_STATUS_COLORS[table.currentStatus],
                  selectedTableId === table.id && "ring-2 ring-indigo-500",
                  table.currentStatus === "cleaning" &&
                    "cursor-not-allowed opacity-50"
                )}
              >
                {/* VIP Badge */}
                {table.isVip && (
                  <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                    VIP
                  </div>
                )}

                {/* Table Name */}
                <div className="text-lg font-bold">{table.tableName}</div>

                {/* Capacity */}
                <div className="text-sm opacity-75">{table.capacity}名</div>

                {/* Status */}
                {showStatus && (
                  <div className="text-xs mt-1">
                    {TABLE_STATUS_LABELS[table.currentStatus]}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {tables.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          テーブルが登録されていません
        </div>
      )}
    </div>
  );
}
