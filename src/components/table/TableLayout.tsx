"use client";

import { useState, useEffect } from "react";
import { PencilIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { tableService } from "@/services/table.service";
import { LoadingSpinner, EmptyState } from "@/components/common";
import type { Table } from "@/types/reservation.types";

interface TableLayoutProps {
  tables?: Table[];
  onTableSelect?: (table: Table) => void;
  onEditTable?: (table: Table, event: React.MouseEvent) => void;
  selectedTableId?: string;
  showStatus?: boolean;
  isLoading?: boolean;
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
  tables: propTables,
  onTableSelect,
  onEditTable,
  selectedTableId,
  showStatus = true,
  isLoading: propIsLoading = false,
}: TableLayoutProps) {
  const [internalTables, setInternalTables] = useState<Table[]>([]);
  const [internalIsLoading, setInternalIsLoading] = useState(true);

  // Use prop tables if provided, otherwise load internally
  const tables = propTables || internalTables;
  const isLoading = propIsLoading || (propTables ? false : internalIsLoading);

  useEffect(() => {
    if (!propTables) {
      loadTables();

      // Subscribe to real-time updates only if not using prop tables
      const unsubscribe = tableService.subscribeToAllTableUpdates(
        (updatedTables) => {
          setInternalTables(updatedTables);
        }
      );

      return () => {
        unsubscribe();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propTables]);

  const loadTables = async () => {
    if (propTables) return; // Don't load if tables are provided as props

    try {
      const data = await tableService.searchTables({ isActive: true });
      setInternalTables(data);
    } catch (error) {
      console.error("Failed to load tables:", error);
    } finally {
      setInternalIsLoading(false);
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
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <EmptyState
        title="テーブルが見つかりません"
        description="条件に一致するテーブルがありません"
      />
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
              <span className="text-sm text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table Layout by Location */}
      {Object.entries(tablesByLocation).map(([location, locationTables]) => (
        <div key={location} className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">{location}</h3>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {locationTables.map((table) => (
              <div key={table.id} className="relative group">
                <button
                  onClick={() => handleTableClick(table)}
                  disabled={table.currentStatus === "cleaning"}
                  className={cn(
                    "relative w-full p-4 rounded-lg border-2 transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                    TABLE_STATUS_COLORS[table.currentStatus],
                    selectedTableId === table.id && "ring-2 ring-indigo-500",
                    table.currentStatus === "cleaning" &&
                      "cursor-not-allowed opacity-50"
                  )}
                >
                  {/* Edit Button */}
                  {onEditTable && (
                    <button
                      onClick={(e) => onEditTable(table, e)}
                      className="absolute top-1 right-1 p-1 rounded bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                      title="テーブル編集"
                    >
                      <PencilIcon className="h-3 w-3 text-gray-600" />
                    </button>
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
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
