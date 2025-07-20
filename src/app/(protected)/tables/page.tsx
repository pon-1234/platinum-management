"use client";

import { useState } from "react";
import { TableLayout } from "@/components/table/TableLayout";
import { TableStatusModal } from "@/components/table/TableStatusModal";
import { RoleGate } from "@/components/auth/RoleGate";
import type { Table } from "@/types/reservation.types";

export default function TablesPage() {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTableSelect = (table: Table) => {
    setSelectedTable(table);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTable(null);
  };

  return (
    <RoleGate allowedRoles={["admin", "manager", "hall"]}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            テーブル管理
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            テーブルをクリックしてステータスを変更できます
          </p>
        </div>

        <TableLayout
          onTableSelect={handleTableSelect}
          selectedTableId={selectedTable?.id}
          showStatus={true}
        />

        {selectedTable && (
          <TableStatusModal
            table={selectedTable}
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onStatusUpdate={handleModalClose}
          />
        )}
      </div>
    </RoleGate>
  );
}
