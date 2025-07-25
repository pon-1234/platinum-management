"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { attendanceService } from "@/services/attendance.service";
import type {
  CreateConfirmedShiftData,
  ShiftType,
} from "@/types/attendance.types";
import {
  ClockIcon,
  UserIcon,
  CalendarIcon,
  TagIcon,
  DocumentTextIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSuccess?: () => void;
}

interface StaffOption {
  id: string;
  name: string;
  role: string;
}

export function AddShiftModal({
  isOpen,
  onClose,
  selectedDate,
  onSuccess,
}: AddShiftModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [formData, setFormData] = useState<{
    staffId: string;
    startTime: string;
    endTime: string;
    shiftType: ShiftType;
    notes: string;
  }>({
    staffId: "",
    startTime: "09:00",
    endTime: "18:00",
    shiftType: "regular",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // スタッフ一覧を取得
  useEffect(() => {
    if (isOpen) {
      loadStaffOptions();
    }
  }, [isOpen]);

  const loadStaffOptions = async () => {
    try {
      setIsLoading(true);

      // 実際のスタッフサービスを使用してスタッフ一覧を取得
      const { data, error } = await attendanceService.supabase
        .from("staffs")
        .select("id, full_name, role")
        .eq("is_active", true)
        .order("full_name");

      if (error) {
        throw new Error(`スタッフ一覧の取得に失敗しました: ${error.message}`);
      }

      const staffList: StaffOption[] = (data || []).map((staff) => ({
        id: staff.id,
        name: staff.full_name,
        role: staff.role,
      }));

      setStaffOptions(staffList);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("スタッフ一覧の取得に失敗しました:", error);
      }
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "スタッフ一覧の取得に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.staffId) {
      newErrors.staffId = "スタッフを選択してください";
    }
    if (!formData.startTime) {
      newErrors.startTime = "開始時間を入力してください";
    }
    if (!formData.endTime) {
      newErrors.endTime = "終了時間を入力してください";
    }
    if (
      formData.startTime &&
      formData.endTime &&
      formData.startTime >= formData.endTime
    ) {
      newErrors.endTime = "終了時間は開始時間より後である必要があります";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const shiftData: CreateConfirmedShiftData = {
        staffId: formData.staffId,
        date: selectedDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        shiftType: formData.shiftType,
        notes: formData.notes.trim() || undefined,
      };

      await attendanceService.createConfirmedShift(shiftData);

      // 成功時の処理
      onSuccess?.();
      onClose();

      // フォームをリセット
      setFormData({
        staffId: "",
        startTime: "09:00",
        endTime: "18:00",
        shiftType: "regular",
        notes: "",
      });
      setErrors({});
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("シフト追加エラー:", error);
      }
      setErrors({
        submit:
          error instanceof Error ? error.message : "シフトの追加に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setErrors({});
    }
  };

  const getShiftTypeLabel = (shiftType: ShiftType) => {
    switch (shiftType) {
      case "regular":
        return "通常シフト";
      case "overtime":
        return "残業";
      case "holiday":
        return "休日出勤";
      case "part_time":
        return "パートタイム";
      default:
        return shiftType;
    }
  };

  const shiftTypes: ShiftType[] = [
    "regular",
    "overtime",
    "holiday",
    "part_time",
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="シフト追加" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date Header */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {format(new Date(selectedDate), "yyyy年M月d日(E)", {
                  locale: ja,
                })}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                新しいシフトを追加
              </p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Staff Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <UserIcon className="h-4 w-4 inline mr-1" />
              スタッフ
            </label>
            <select
              value={formData.staffId}
              onChange={(e) =>
                setFormData({ ...formData, staffId: e.target.value })
              }
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 ${
                errors.staffId
                  ? "border-red-300 dark:border-red-600"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              disabled={isLoading || isSubmitting}
            >
              <option value="">スタッフを選択してください</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.role})
                </option>
              ))}
            </select>
            {errors.staffId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.staffId}
              </p>
            )}
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <ClockIcon className="h-4 w-4 inline mr-1" />
                開始時間
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 ${
                  errors.startTime
                    ? "border-red-300 dark:border-red-600"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                disabled={isSubmitting}
              />
              {errors.startTime && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.startTime}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <ClockIcon className="h-4 w-4 inline mr-1" />
                終了時間
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 ${
                  errors.endTime
                    ? "border-red-300 dark:border-red-600"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                disabled={isSubmitting}
              />
              {errors.endTime && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.endTime}
                </p>
              )}
            </div>
          </div>

          {/* Shift Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <TagIcon className="h-4 w-4 inline mr-1" />
              シフトタイプ
            </label>
            <select
              value={formData.shiftType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shiftType: e.target.value as ShiftType,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100"
              disabled={isSubmitting}
            >
              {shiftTypes.map((type) => (
                <option key={type} value={type}>
                  {getShiftTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <DocumentTextIcon className="h-4 w-4 inline mr-1" />
              備考
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100"
              placeholder="必要に応じて備考を入力してください"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">
              {errors.submit}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                追加中...
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                シフトを追加
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
