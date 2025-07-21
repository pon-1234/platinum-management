"use client";

import { useState } from "react";
import { Staff } from "@/types/staff.types";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { PencilIcon, EyeIcon, TrashIcon } from "@heroicons/react/24/outline";
import { formatDate } from "@/lib/utils/formatting";

interface StaffListProps {
  staff: Staff[];
  onEdit?: (staff: Staff) => void;
  onDelete?: (staff: Staff) => void;
  onView?: (staff: Staff) => void;
}

export function StaffList({ staff, onEdit, onDelete, onView }: StaffListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = () => {
    if (selectedIds.length === staff.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(staff.map((s) => s.id));
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
                checked={selectedIds.length === staff.length}
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
              役職
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
            >
              雇用日
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
          {staff.map((staffMember) => (
            <tr
              key={staffMember.id}
              className={
                selectedIds.includes(staffMember.id) ? "bg-gray-50" : ""
              }
            >
              <td className="relative px-6 sm:w-12 sm:px-6">
                <input
                  type="checkbox"
                  className="absolute left-6 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  value={staffMember.id}
                  checked={selectedIds.includes(staffMember.id)}
                  onChange={() => handleSelectOne(staffMember.id)}
                />
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                <div className="font-medium">{staffMember.fullName}</div>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm">
                <RoleBadge role={staffMember.role} />
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {formatDate(staffMember.hireDate)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    staffMember.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {staffMember.isActive ? "有効" : "無効"}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {formatDate(staffMember.createdAt)}
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex items-center justify-end gap-2">
                  {onView && (
                    <button
                      onClick={() => onView(staffMember)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <EyeIcon className="h-5 w-5" />
                      <span className="sr-only">詳細</span>
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(staffMember)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <PencilIcon className="h-5 w-5" />
                      <span className="sr-only">編集</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(staffMember)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-5 w-5" />
                      <span className="sr-only">削除</span>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {staff.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">スタッフが見つかりません</p>
        </div>
      )}
    </div>
  );
}
