"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { TableLayout } from "@/components/table/TableLayout";
import { TableStatusModal } from "@/components/table/TableStatusModal";
import { TableManagementModal } from "@/components/table/TableManagementModal";
import { TableFilters } from "@/components/table/TableFilters";
import { TableDashboard } from "@/components/table/TableDashboard";
import { RoleGate } from "@/components/auth/RoleGate";
import { usePermission } from "@/hooks/usePermission";
import { tableService } from "@/services/table.service";
import type { Table, TableSearchParams } from "@/types/reservation.types";

export default function TablesPage() {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [filteredTables, setFilteredTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<TableSearchParams>({ isActive: true });
  const { can } = usePermission();

  // Load tables on mount
  useEffect(() => {
    loadTables();
  }, []);

  const applyFiltersAndSearch = useCallback(() => {
    let filtered = tables;

    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter((table) =>
        table.tableName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filters
    if (filters.status) {
      filtered = filtered.filter(
        (table) => table.currentStatus === filters.status
      );
    }
    if (filters.isVip !== undefined) {
      filtered = filtered.filter((table) => table.isVip === filters.isVip);
    }
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(
        (table) => table.isActive === filters.isActive
      );
    }
    if (filters.minCapacity) {
      filtered = filtered.filter(
        (table) => table.capacity >= filters.minCapacity!
      );
    }
    if (filters.maxCapacity) {
      filtered = filtered.filter(
        (table) => table.capacity <= filters.maxCapacity!
      );
    }

    setFilteredTables(filtered);
  }, [tables, filters, searchQuery]);

  // Apply filters and search
  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  const loadTables = async () => {
    setIsLoading(true);
    try {
      const allTables = await tableService.searchTables({});
      setTables(allTables);
    } catch (error) {
      console.error("Failed to load tables:", error);
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              テーブル管理
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
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

        {/* Dashboard */}
        <TableDashboard tables={tables} isLoading={isLoading} />

        {/* Filters */}
        <div className="mb-6">
          <TableFilters
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
          />
        </div>

        {/* Table Layout */}
        <TableLayout
          tables={filteredTables}
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
        <TableManagementModal
          isOpen={isManagementModalOpen}
          onClose={handleManagementModalClose}
          onSuccess={handleManagementSuccess}
          table={editingTable}
        />
      </div>
    </RoleGate>
  );
}
