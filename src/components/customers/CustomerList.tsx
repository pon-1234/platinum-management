"use client";

import { useState, memo, useEffect } from "react";
import Link from "next/link";
import { FixedSizeList } from "react-window";
import { DataTable, DataTableColumn } from "@/components/table/DataTable";
import { Customer } from "@/types/customer.types";
import { CustomerStatusBadge } from "@/components/ui/StatusBadge";
import { PencilIcon, EyeIcon } from "@heroicons/react/24/outline";
import { formatDate, formatPhoneNumber } from "@/lib/utils/formatting";

interface CustomerListProps {
  customers: Customer[];
  onEdit?: (customer: Customer) => void;
  onSelectionChange?: (ids: string[]) => void;
}

const Row = memo(
  ({
    index,
    style,
    data,
  }: {
    index: number;
    style: React.CSSProperties;
    data: {
      customers: Customer[];
      selectedIds: string[];
      handleSelectOne: (id: string) => void;
      onEdit?: (customer: Customer) => void;
    };
  }) => {
    const customer = data.customers[index];
    const isSelected = data.selectedIds.includes(customer.id);

    return (
      <div style={style} className="flex items-center border-b border-gray-200">
        <div className="relative px-6 sm:w-12 sm:px-6">
          <input
            type="checkbox"
            className="absolute left-6 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            value={customer.id}
            checked={isSelected}
            onChange={() => data.handleSelectOne(customer.id)}
          />
        </div>
        <div className="flex-1 whitespace-nowrap px-3 py-4 text-sm">
          <div className="font-medium text-gray-900">{customer.name}</div>
          {customer.nameKana && (
            <div className="text-gray-500">{customer.nameKana}</div>
          )}
        </div>
        <div className="flex-1 whitespace-nowrap px-3 py-4 text-sm text-gray-500">
          {formatPhoneNumber(customer.phoneNumber)}
        </div>
        <div className="flex-1 whitespace-nowrap px-3 py-4 text-sm text-gray-500">
          {customer.lineId || "-"}
        </div>
        <div className="flex-1 whitespace-nowrap px-3 py-4 text-sm text-gray-500">
          {formatDate(customer.birthday)}
        </div>
        <div className="flex-1 whitespace-nowrap px-3 py-4 text-sm">
          <CustomerStatusBadge status={customer.status} />
        </div>
        <div className="flex-1 whitespace-nowrap px-3 py-4 text-sm text-gray-500">
          {formatDate(customer.createdAt)}
        </div>
        <div className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/customers/${customer.id}`}
              className="text-gray-400 hover:text-gray-500"
            >
              <EyeIcon className="h-5 w-5" />
              <span className="sr-only">詳細</span>
            </Link>
            {data.onEdit && (
              <button
                onClick={() => data.onEdit?.(customer)}
                className="text-indigo-600 hover:text-indigo-900"
              >
                <PencilIcon className="h-5 w-5" />
                <span className="sr-only">編集</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
Row.displayName = "Row";

export function CustomerList({
  customers,
  onEdit,
  onSelectionChange,
}: CustomerListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Notify parent on selection change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    onSelectionChange?.(selectedIds);
  }, [selectedIds]);

  const columns: DataTableColumn<Customer>[] = [
    {
      key: "name",
      header: "名前",
      cell: (c) => (
        <div>
          <div className="font-medium text-gray-900">{c.name}</div>
          {c.nameKana && <div className="text-gray-500">{c.nameKana}</div>}
        </div>
      ),
    },
    {
      key: "phone",
      header: "電話番号",
      cell: (c) => (
        <span className="text-gray-500">
          {formatPhoneNumber(c.phoneNumber)}
        </span>
      ),
    },
    {
      key: "line",
      header: "LINE ID",
      cell: (c) => <span className="text-gray-500">{c.lineId || "-"}</span>,
    },
    {
      key: "birthday",
      header: "誕生日",
      cell: (c) => (
        <span className="text-gray-500">{formatDate(c.birthday)}</span>
      ),
    },
    {
      key: "status",
      header: "ステータス",
      cell: (c) => <CustomerStatusBadge status={c.status} />,
    },
    {
      key: "created",
      header: "登録日",
      cell: (c) => (
        <span className="text-gray-500">{formatDate(c.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "操作",
      cell: (c) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/customers/${c.id}`}
            className="text-gray-400 hover:text-gray-500"
          >
            <EyeIcon className="h-5 w-5" />
            <span className="sr-only">詳細</span>
          </Link>
          {onEdit && (
            <button
              onClick={() => onEdit?.(c)}
              className="text-indigo-600 hover:text-indigo-900"
            >
              <PencilIcon className="h-5 w-5" />
              <span className="sr-only">編集</span>
            </button>
          )}
        </div>
      ),
      className: "text-right",
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={customers}
      getRowKey={(c) => c.id}
      rowHeight={65}
      selection={{
        isAllSelected:
          selectedIds.length > 0 && selectedIds.length === customers.length,
        isSelected: (c) => selectedIds.includes(c.id),
        onToggleAll: handleSelectAll,
        onToggleOne: (c) => handleSelectOne(c.id),
      }}
    />
  );
}
