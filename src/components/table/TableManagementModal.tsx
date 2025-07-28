"use client";

import { useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner, ErrorMessage } from "@/components/common";
import { useFormValidation } from "@/hooks/useFormValidation";
import { tableService } from "@/services/table.service";
import { z } from "zod";
import type { Table } from "@/types/reservation.types";

// Validation schema
const tableManagementSchema = z.object({
  tableName: z
    .string()
    .min(1, "テーブル名は必須です")
    .max(20, "テーブル名は20文字以内で入力してください"),
  capacity: z
    .number()
    .min(1, "定員は1名以上で設定してください")
    .max(20, "定員は20名以下で設定してください"),
  location: z
    .string()
    .max(50, "設置場所は50文字以内で入力してください")
    .optional(),
  isActive: z.boolean(),
});

type TableManagementData = z.infer<typeof tableManagementSchema>;

interface TableManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  table?: Table | null; // null for create, Table object for edit
}

export function TableManagementModal({
  isOpen,
  onClose,
  onSuccess,
  table,
}: TableManagementModalProps) {
  const isEditing = !!table;

  const form = useFormValidation<TableManagementData>({
    schema: tableManagementSchema,
    defaultValues: {
      tableName: "",
      capacity: 2,
      location: "",
      isActive: true,
    },
  });

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("TableManagementModal - isOpen:", isOpen);
      console.log("TableManagementModal - form values:", form.getValues());
    }
  }, [isOpen, form]);

  // Reset form when opening/closing or when table changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        tableName: table?.tableName || "",
        capacity: table?.capacity || 2,
        location: table?.location || "",
        isActive: table?.isActive ?? true,
      });

      // Set focus to first input field after a short delay
      setTimeout(() => {
        const firstInput = document.querySelector<HTMLInputElement>(
          'input[name="tableName"]'
        );
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    }
  }, [isOpen, table, form]);

  const handleSubmit = async (data: TableManagementData) => {
    try {
      if (isEditing && table) {
        // Update existing table
        await tableService.updateTable(table.id, {
          tableName: data.tableName,
          capacity: data.capacity,
          location: data.location || null,
          isActive: data.isActive,
        });
      } else {
        // Create new table
        await tableService.createTable({
          tableName: data.tableName,
          capacity: data.capacity,
          location: data.location || null,
          isActive: data.isActive,
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Failed to save table:", error);
      form.setError("root", {
        message: isEditing
          ? "テーブルの更新に失敗しました"
          : "テーブルの作成に失敗しました",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "テーブル編集" : "新規テーブル作成"}
      size="md"
    >
      <form
        onSubmit={form.handleAsyncSubmit(handleSubmit)}
        className="space-y-6"
      >
        {/* Root Error */}
        {form.formState.errors.root && (
          <ErrorMessage message={form.formState.errors.root.message!} />
        )}

        {/* Table Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            テーブル名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...form.register("tableName")}
            placeholder="例: A1, VIP1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {form.formState.errors.tableName && (
            <ErrorMessage message={form.formState.errors.tableName.message!} />
          )}
        </div>

        {/* Capacity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            定員 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            {...form.register("capacity", { valueAsNumber: true })}
            min="1"
            max="20"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {form.formState.errors.capacity && (
            <ErrorMessage message={form.formState.errors.capacity.message!} />
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            設置場所
          </label>
          <input
            type="text"
            {...form.register("location")}
            placeholder="例: 1階メインフロア, 2階VIPルーム"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            空欄の場合は「その他」として分類されます
          </p>
          {form.formState.errors.location && (
            <ErrorMessage message={form.formState.errors.location.message!} />
          )}
        </div>

        {/* Active Status */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...form.register("isActive")}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">有効</span>
          </label>
          <p className="text-sm text-gray-500 mt-1">
            無効にするとテーブル一覧に表示されなくなります
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {form.formState.isSubmitting && <LoadingSpinner size="sm" />}
            {form.formState.isSubmitting
              ? isEditing
                ? "更新中..."
                : "作成中..."
              : isEditing
                ? "更新"
                : "作成"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
