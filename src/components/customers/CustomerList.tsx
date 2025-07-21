"use client";

import { useState } from "react";
import Link from "next/link";
import { Customer } from "@/types/customer.types";
import { CustomerStatusBadge } from "@/components/ui/StatusBadge";
import { PencilIcon, EyeIcon } from "@heroicons/react/24/outline";
import { formatDate, formatPhoneNumber } from "@/lib/utils/formatting";

interface CustomerListProps {
  customers: Customer[];
  onEdit?: (customer: Customer) => void;
}

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
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="relative px-6 sm:w-12 sm:px-6">
              <input
                type="checkbox"
                className="absolute left-6 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={selectedIds.length === customers.length}
                onChange={handleSelectAll}
              />
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              名前
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              電話番号
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              LINE ID
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              誕生日
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              ステータス
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              登録日
            </th>
            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className={selectedIds.includes(customer.id) ? "bg-gray-50" : ""}
            >
              <td className="relative px-6 sm:w-12 sm:px-6">
                <input
                  type="checkbox"
                  className="absolute left-6 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  value={customer.id}
                  checked={selectedIds.includes(customer.id)}
                  onChange={() => handleSelectOne(customer.id)}
                />
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                <div>
                  <div className="font-medium">{customer.name}</div>
                  {customer.nameKana && (
                    <div className="text-gray-500">{customer.nameKana}</div>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {formatPhoneNumber(customer.phoneNumber)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {customer.lineId || "-"}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {formatDate(customer.birthday ?? null)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm">
                <CustomerStatusBadge status={customer.status} />
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {formatDate(customer.createdAt)}
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <EyeIcon className="h-5 w-5" />
                    <span className="sr-only">詳細</span>
                  </Link>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(customer)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <PencilIcon className="h-5 w-5" />
                      <span className="sr-only">編集</span>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
