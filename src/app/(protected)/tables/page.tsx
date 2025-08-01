"use client";

import { useState, useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { TableLayout } from "@/components/table/TableLayout";
import { TableStatusModal } from "@/components/table/TableStatusModal";
import { TableManagementModal } from "@/components/table/TableManagementModal";
import { TableFilters } from "@/components/table/TableFilters";
import { TableDashboard } from "@/components/table/TableDashboard";
import RealTimeTableDashboard from "@/components/table/RealTimeTableDashboard";
import { RoleGate } from "@/components/auth/RoleGate";
import { usePermission } from "@/hooks/usePermission";
import { tableService } from "@/services/table.service";
import type { Table, TableSearchParams } from "@/types/reservation.types";

export default function TablesPage() {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);

  // Debug: Log modal state
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Management modal state:", isManagementModalOpen);
    }
  }, [isManagementModalOpen]);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<TableSearchParams>({ isActive: true });
  const { can } = usePermission();

  // Load tables when filters or search changes
  useEffect(() => {
    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchQuery]);

  const loadTables = async () => {
    setIsLoading(true);
    try {
      const searchParams: TableSearchParams = {
        ...filters,
        search: searchQuery || undefined,
      };
      const allTables = await tableService.searchTables(searchParams);
      setTables(allTables);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to load tables:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableSelect = (table: Table) => {
    setSelectedTable(table);
    setIsStatusModalOpen(true);
  };

  const handleStatusModalClose = () => {
    setIsStatusModalOpen(false);
    setSelectedTable(null);
  };

  const handleCreateTable = () => {
    setEditingTable(null);
    setIsManagementModalOpen(true);
  };

  const handleEditTable = (table: Table, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent table selection
    setEditingTable(table);
    setIsManagementModalOpen(true);
  };

  const handleManagementModalClose = () => {
    setIsManagementModalOpen(false);
    setEditingTable(null);
  };

  const handleManagementSuccess = () => {
    setIsManagementModalOpen(false);
    setEditingTable(null);
    loadTables(); // Refresh the table list
  };

  const handleStatusUpdate = () => {
    setIsStatusModalOpen(false);
    setSelectedTable(null);
    loadTables(); // Refresh the table list
  };

  const handleFilterChange = (newFilters: TableSearchParams) => {
    setFilters(newFilters);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <RoleGate allowedRoles={["admin", "manager", "hall"]}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">テーブル管理</h1>
            <p className="mt-2 text-sm text-gray-600">
              テーブルをクリックしてステータスを変更できます
            </p>
          </div>
          {can("table", "manage") && (
            <button
              onClick={handleCreateTable}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              テーブル作成
            </button>
          )}
        </div>

        {/* Real-time Dashboard */}
        <RealTimeTableDashboard onTableSelect={handleTableSelect} />

        {/* Traditional Dashboard */}
        <div className="mt-8">
          <TableDashboard tables={tables} isLoading={isLoading} />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <TableFilters
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
          />
        </div>

        {/* Table Layout */}
        <TableLayout
          tables={tables}
          onTableSelect={handleTableSelect}
          onEditTable={can("table", "manage") ? handleEditTable : undefined}
          selectedTableId={selectedTable?.id}
          showStatus={true}
          isLoading={isLoading}
        />

        {/* Status Modal */}
        {selectedTable && (
          <TableStatusModal
            table={selectedTable}
            isOpen={isStatusModalOpen}
            onClose={handleStatusModalClose}
            onStatusUpdate={handleStatusUpdate}
          />
        )}

        {/* Management Modal */}
        {isManagementModalOpen && (
          <TableManagementModal
            isOpen={isManagementModalOpen}
            onClose={handleManagementModalClose}
            onSuccess={handleManagementSuccess}
            table={editingTable}
          />
        )}
      </div>
    </RoleGate>
  );
}
