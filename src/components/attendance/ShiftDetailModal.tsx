"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { CalendarShift } from "@/types/attendance.types";
import {
  ClockIcon,
  UserIcon,
  CalendarIcon,
  TagIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface ShiftDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: CalendarShift;
  onEdit?: (shift: CalendarShift) => void;
  onDelete?: (shift: CalendarShift) => void;
}

export function ShiftDetailModal({
  isOpen,
  onClose,
  shift,
  onEdit,
  onDelete,
}: ShiftDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDateTime = (date: string, time: string) => {
    const dateTime = new Date(`${date}T${time}`);
    return format(dateTime, "M月d日(E) HH:mm", { locale: ja });
  };

  const getShiftTypeLabel = (shiftType: string) => {
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

  const getShiftTypeColor = (shiftType: string) => {
    switch (shiftType) {
      case "regular":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "overtime":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "holiday":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "part_time":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(shift);
      onClose();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("シフト削除エラー:", error);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const calculateWorkHours = () => {
    const start = new Date(`2000-01-01T${shift.startTime}`);
    const end = new Date(`2000-01-01T${shift.endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(0, diffHours);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="シフト詳細" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {shift.staffName}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatDateTime(shift.date, shift.startTime)}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getShiftTypeColor(shift.shiftType)}`}
            >
              {getShiftTypeLabel(shift.shiftType)}
            </span>
          </div>
        </div>

        {/* Shift Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              時間情報
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  開始時間
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                  {shift.startTime}
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  終了時間
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                  {shift.endTime}
                </dd>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between items-center">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    勤務時間
                  </dt>
                  <dd className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {calculateWorkHours().toFixed(1)}時間
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Shift Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              シフト情報
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  日付
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {format(new Date(shift.date), "yyyy年M月d日(E)", {
                    locale: ja,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  シフトタイプ
                </dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getShiftTypeColor(shift.shiftType)}`}
                  >
                    <TagIcon className="h-3 w-3 mr-1" />
                    {getShiftTypeLabel(shift.shiftType)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  ステータス
                </dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      shift.status === "confirmed"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        : shift.status === "requested"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                    }`}
                  >
                    {shift.status === "confirmed"
                      ? "確定"
                      : shift.status === "requested"
                        ? "申請中"
                        : "下書き"}
                  </span>
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {shift.notes && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5" />
              備考
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {shift.notes}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            {onEdit && (
              <button
                onClick={() => onEdit(shift)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
                編集
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
                {isDeleting ? "削除中..." : "削除"}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </Modal>
  );
}
