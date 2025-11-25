"use client";

import { useState } from "react";
import {
  BottleKeepDetail,
  BottleKeepSearchFilter,
} from "@/types/bottle-keep.types";
import {
  PencilIcon,
  EyeIcon,
  BeakerIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { formatDate, formatCurrency } from "@/lib/utils/formatting";
import { SelectionPanel } from "@/components/table/SelectionPanel";
import { convertToCSV, downloadCSV } from "@/lib/utils/export";
import { DataTable, DataTableColumn } from "@/components/table/DataTable";

interface BottleKeepListProps {
  bottleKeeps: BottleKeepDetail[];
  onEdit?: (bottleKeep: BottleKeepDetail) => void;
  onView?: (bottleKeep: BottleKeepDetail) => void;
  onUse?: (bottleKeep: BottleKeepDetail) => void;
  onFilterChange?: (filter: BottleKeepSearchFilter) => void;
  customers?: Array<{ id: string; name: string }>;
  products?: Array<{ id: number; name: string }>;
  storageLocations?: string[];
}

export function BottleKeepList({
  bottleKeeps,
  onEdit,
  onView,
  onUse,
  onFilterChange,
  storageLocations = [],
}: BottleKeepListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<BottleKeepSearchFilter>({
    searchTerm: "",
    status: undefined,
    storageLocation: "",
    sortBy: "expiryDate",
    sortOrder: "asc",
  });

  const handleFilterChange = (newFilter: Partial<BottleKeepSearchFilter>) => {
    const updatedFilter = { ...filter, ...newFilter };
    setFilter(updatedFilter);
    onFilterChange?.(updatedFilter);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === bottleKeeps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(bottleKeeps.map((b) => b.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return { label: "保管中", color: "bg-green-100 text-green-800" };
      case "consumed":
        return { label: "消費済み", color: "bg-blue-100 text-blue-800" };
      case "expired":
        return { label: "期限切れ", color: "bg-red-100 text-red-800" };
      default:
        return { label: status, color: "bg-gray-100 text-gray-800" };
    }
  };

  const getRemainingAmountColor = (amount: number) => {
    if (amount <= 0.1) return "text-red-600";
    if (amount <= 0.25) return "text-yellow-600";
    if (amount <= 0.5) return "text-blue-600";
    return "text-green-600";
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return {
        type: "expired",
        label: `${Math.abs(daysUntilExpiry)}日経過`,
        color: "text-red-600",
      };
    } else if (daysUntilExpiry <= 7) {
      return {
        type: "expiring",
        label: `${daysUntilExpiry}日`,
        color: "text-red-600",
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        type: "warning",
        label: `${daysUntilExpiry}日`,
        color: "text-yellow-600",
      };
    } else {
      return {
        type: "normal",
        label: `${daysUntilExpiry}日`,
        color: "text-gray-600",
      };
    }
  };

  return (
    <div className="space-y-4">
      {/* フィルター・検索 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div>
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700"
            >
              顧客・商品名検索
            </label>
            <input
              type="text"
              id="search"
              placeholder="名前を入力..."
              value={filter.searchTerm}
              onChange={(e) =>
                handleFilterChange({ searchTerm: e.target.value })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              ステータス
            </label>
            <select
              id="status"
              value={filter.status || ""}
              onChange={(e) =>
                handleFilterChange({
                  status:
                    (e.target.value as "active" | "consumed" | "expired") ||
                    undefined,
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">すべて</option>
              <option value="active">保管中</option>
              <option value="consumed">消費済み</option>
              <option value="expired">期限切れ</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="storage"
              className="block text-sm font-medium text-gray-700"
            >
              保管場所
            </label>
            <select
              id="storage"
              value={filter.storageLocation}
              onChange={(e) =>
                handleFilterChange({ storageLocation: e.target.value })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">すべて</option>
              {storageLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="sortBy"
              className="block text-sm font-medium text-gray-700"
            >
              並び順
            </label>
            <select
              id="sortBy"
              value={filter.sortBy}
              onChange={(e) =>
                handleFilterChange({
                  sortBy: e.target.value as
                    | "expiryDate"
                    | "openedDate"
                    | "customerName"
                    | "productName",
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="expiryDate">期限日</option>
              <option value="openedDate">開封日</option>
              <option value="customerName">顧客名</option>
              <option value="productName">商品名</option>
            </select>
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={() =>
                handleFilterChange({
                  expiringWithin: filter.expiringWithin ? undefined : 7,
                })
              }
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filter.expiringWithin
                  ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
            >
              期限間近
            </button>
            <button
              onClick={() =>
                handleFilterChange({ lowAmount: !filter.lowAmount })
              }
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filter.lowAmount
                  ? "bg-orange-100 text-orange-700 border border-orange-300"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
            >
              残量少
            </button>
          </div>
        </div>
      </div>

      {/* ボトルキープ一覧（共通 DataTable） */}
      <DataTable
        columns={
          [
            {
              key: "bottle_number",
              header: "ボトル番号",
              cell: (b: BottleKeepDetail) => (
                <div className="text-sm font-medium text-gray-900">
                  {b.bottle_number}
                </div>
              ),
            },
            {
              key: "customer",
              header: "顧客",
              cell: (b: BottleKeepDetail) => (
                <div>
                  <div className="text-sm text-gray-900">
                    {b.customer?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {b.customer?.phone_number}
                  </div>
                </div>
              ),
            },
            {
              key: "product",
              header: "商品",
              cell: (b: BottleKeepDetail) => (
                <div>
                  <div className="text-sm text-gray-900">{b.product?.name}</div>
                  <div className="text-xs text-gray-500">
                    {b.product?.category}
                  </div>
                </div>
              ),
            },
            {
              key: "remaining",
              header: "残量",
              cell: (b: BottleKeepDetail) => (
                <div>
                  <div
                    className={`text-sm font-medium ${getRemainingAmountColor(
                      b.remaining_amount ?? 0
                    )}`}
                  >
                    {Math.round((b.remaining_amount ?? 0) * 100)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(
                      (b.product?.price || 0) * (b.remaining_amount ?? 0)
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: "opened",
              header: "開封日",
              cell: (b: BottleKeepDetail) => (
                <span>{formatDate(b.opened_date)}</span>
              ),
            },
            {
              key: "expiry",
              header: "期限日",
              cell: (b: BottleKeepDetail) => {
                const expiryStatus = getExpiryStatus(b.expiry_date);
                return (
                  <div>
                    <div className="text-sm text-gray-900">
                      {formatDate(b.expiry_date)}
                    </div>
                    {expiryStatus && (
                      <div
                        className={`text-xs ${expiryStatus.color} flex items-center`}
                      >
                        {expiryStatus.type === "expired" && (
                          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        )}
                        {expiryStatus.type === "expiring" && (
                          <ClockIcon className="h-3 w-3 mr-1" />
                        )}
                        {expiryStatus.label}
                      </div>
                    )}
                  </div>
                );
              },
            },
            {
              key: "storage",
              header: "保管場所",
              cell: (b: BottleKeepDetail) => (
                <span className="text-gray-500">
                  {b.storage_location || "-"}
                </span>
              ),
            },
            {
              key: "status",
              header: "ステータス",
              cell: (b: BottleKeepDetail) => {
                const s = getStatusBadge(b.status);
                return (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}
                  >
                    {s.label}
                  </span>
                );
              },
            },
            {
              key: "actions",
              header: "操作",
              className: "text-right",
              cell: (b: BottleKeepDetail) => (
                <div className="flex space-x-2 justify-end">
                  {onView && (
                    <button
                      onClick={() => onView(b as BottleKeepDetail)}
                      className="text-blue-600 hover:text-blue-900"
                      title="詳細表示"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  )}
                  {onUse && b.status === "active" && (
                    <button
                      onClick={() => onUse(b as BottleKeepDetail)}
                      className="text-green-600 hover:text-green-900"
                      title="使用記録"
                    >
                      <BeakerIcon className="h-4 w-4" />
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(b as BottleKeepDetail)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="編集"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ),
            },
          ] as DataTableColumn<BottleKeepDetail>[]
        }
        rows={bottleKeeps}
        getRowKey={(b) => b.id}
        selection={{
          isAllSelected:
            selectedIds.length === bottleKeeps.length && bottleKeeps.length > 0,
          isSelected: (b) => selectedIds.includes((b as BottleKeepDetail).id),
          onToggleAll: handleSelectAll,
          onToggleOne: (b) => handleSelectOne((b as BottleKeepDetail).id),
        }}
      />

      <SelectionPanel
        selectedCount={selectedIds.length}
        actions={[
          {
            label: "選択をエクスポート",
            onClick: () => {
              const all = bottleKeeps.filter((b) => selectedIds.includes(b.id));
              const rows = all.map((b) => ({
                id: b.id,
                bottle_number: b.bottle_number,
                customer: b.customer?.name,
                product: b.product?.name,
                remaining: Math.round((b.remaining_amount ?? 0) * 100),
                opened_date: b.opened_date,
                expiry_date: b.expiry_date || "",
                storage_location: b.storage_location || "",
                status: b.status,
              }));
              const csv = convertToCSV(rows);
              const ts = new Date()
                .toISOString()
                .slice(0, 19)
                .replace(/[:T]/g, "-");
              downloadCSV(csv, `bottles_selected_${ts}.csv`);
            },
          },
        ]}
      />
    </div>
  );
}
