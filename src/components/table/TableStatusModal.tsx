"use client";

import { X } from "lucide-react";
import { tableService } from "@/services/table.service";
import { useFormValidation } from "@/hooks/useFormValidation";
import { LoadingSpinner, ErrorMessage } from "@/components/common";
import {
  tableStatusUpdateSchema,
  TableStatusUpdateData,
} from "@/lib/validations/table";
import type { Table, TableStatus } from "@/types/reservation.types";

interface TableStatusModalProps {
  table: Table;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: () => void;
}

const STATUS_OPTIONS: {
  value: TableStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "available",
    label: "空席",
    description: "すぐに利用可能な状態",
  },
  {
    value: "reserved",
    label: "予約",
    description: "予約されているが、まだ来店していない",
  },
  {
    value: "occupied",
    label: "使用中",
    description: "現在お客様が利用中",
  },
  {
    value: "cleaning",
    label: "清掃中",
    description: "清掃・準備中で利用不可",
  },
];

export function TableStatusModal({
  table,
  isOpen,
  onClose,
  onStatusUpdate,
}: TableStatusModalProps) {
  const form = useFormValidation<TableStatusUpdateData>({
    schema: tableStatusUpdateSchema,
    defaultValues: {
      status: table.currentStatus,
    },
  });

  if (!isOpen) return null;

  const handleSubmit = async (data: TableStatusUpdateData) => {
    if (data.status === table.currentStatus) {
      onClose();
      return;
    }

    try {
      await tableService.updateTableStatus(table.id, data.status);
      if (onStatusUpdate) {
        onStatusUpdate();
      }
      onClose();
    } catch (error) {
      console.error("Failed to update table status:", error);
      throw new Error("ステータスの更新に失敗しました");
    }
  };

  const selectedStatus = form.watch("status");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <form
          onSubmit={form.handleAsyncSubmit(handleSubmit)}
          className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
        >
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={onClose}
              disabled={form.formState.isSubmitting}
            >
              <span className="sr-only">閉じる</span>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                テーブルステータス変更
              </h3>

              {/* Form Error */}
              {form.formState.errors.root && (
                <div className="mt-2">
                  <ErrorMessage message={form.formState.errors.root.message!} />
                </div>
              )}

              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  テーブル:{""}
                  <span className="font-medium">{table.tableName}</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  定員: {table.capacity}名
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {STATUS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${
                      selectedStatus === option.value
                        ? "border-indigo-500 ring-2 ring-indigo-500"
                        : "border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      {...form.register("status")}
                      value={option.value}
                      className="sr-only"
                      disabled={form.formState.isSubmitting}
                    />
                    <div className="flex flex-1">
                      <div className="flex flex-col">
                        <span className="block text-sm font-medium text-gray-900">
                          {option.label}
                        </span>
                        <span className="mt-1 flex items-center text-sm text-gray-500">
                          {option.description}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`ml-3 flex h-5 w-5 items-center justify-center rounded-full border ${
                        selectedStatus === option.value
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {selectedStatus === option.value && (
                        <span className="h-2.5 w-2.5 rounded-full bg-white" />
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Field Error */}
              {form.formState.errors.status && (
                <div className="mt-2">
                  <ErrorMessage
                    message={form.formState.errors.status.message!}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto items-center gap-2"
            >
              {form.formState.isSubmitting && <LoadingSpinner size="sm" />}
              {form.formState.isSubmitting ? "更新中..." : "更新"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={form.formState.isSubmitting}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
