"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { FixedSizeList } from "react-window";
import { Customer } from "@/types/customer.types";
import { CustomerStatusBadge } from "@/components/ui/StatusBadge";
import { PencilIcon, EyeIcon } from "@heroicons/react/24/outline";
import { formatDate, formatPhoneNumber } from "@/lib/utils/formatting";

interface CustomerListProps {
  customers: Customer[];
  onEdit?: (customer: Customer) => void;
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

export function CustomerList({ customers, onEdit }: CustomerListProps) {
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

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <div className="bg-gray-50 flex items-center border-b border-gray-300">
        <div className="relative px-6 sm:w-12 sm:px-6">
          <input
            type="checkbox"
            className="absolute left-6 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            checked={
              selectedIds.length > 0 && selectedIds.length === customers.length
            }
            onChange={handleSelectAll}
          />
        </div>
        <div className="flex-1 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
          名前
        </div>
        <div className="flex-1 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
          電話番号
        </div>
        <div className="flex-1 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
          LINE ID
        </div>
        <div className="flex-1 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
          誕生日
        </div>
        <div className="flex-1 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
          ステータス
        </div>
        <div className="flex-1 px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
          登録日
        </div>
        <div className="relative py-3.5 pl-3 pr-4 sm:pr-6">
          <span className="sr-only">Actions</span>
        </div>
      </div>
      <FixedSizeList
        height={600} // Adjust height as needed
        itemCount={customers.length}
        itemSize={65} // Adjust itemSize to match your row height
        width="100%"
        itemData={{
          customers,
          selectedIds,
          handleSelectOne,
          onEdit,
        }}
      >
        {Row}
      </FixedSizeList>
    </div>
  );
}
