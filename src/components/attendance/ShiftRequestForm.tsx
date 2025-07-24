"use client";

import { useState } from "react";
import { attendanceService } from "@/services/attendance.service";
import type { CreateShiftRequestData } from "@/types/attendance.types";
import { PlusIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";

interface ShiftRequestFormProps {
  onRequestCreated?: () => void;
}

export default function ShiftRequestForm({
  onRequestCreated,
}: ShiftRequestFormProps) {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    requestedDate: "",
    startTime: "",
    endTime: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.requestedDate || !formData.startTime || !formData.endTime) {
      toast.error("日付と開始・終了時刻は必須です");
      return;
    }

    // Validate that end time is after start time
    const startDateTime = new Date(
      `${formData.requestedDate}T${formData.startTime}`
    );
    const endDateTime = new Date(
      `${formData.requestedDate}T${formData.endTime}`
    );

    if (endDateTime <= startDateTime) {
      toast.error("終了時刻は開始時刻より後に設定してください");
      return;
    }

    // Validate that the requested date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestedDate = new Date(formData.requestedDate);

    if (requestedDate < today) {
      toast.error("過去の日付は選択できません");
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData: CreateShiftRequestData = {
        requestedDate: formData.requestedDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        notes: formData.notes || undefined,
      };

      await attendanceService.createShiftRequest(requestData);

      // Reset form
      setFormData({
        requestedDate: "",
        startTime: "",
        endTime: "",
        notes: "",
      });

      setShowModal(false);
      onRequestCreated?.();
      toast.success("シフト申請を提出しました");
    } catch (error) {
      console.error("Failed to create shift request:", error);
      toast.error("シフト申請の提出に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
        シフト申請
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="新規シフト申請"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              希望日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.requestedDate}
              onChange={(e) =>
                handleInputChange("requestedDate", e.target.value)
              }
              min={new Date().toISOString().split("T")[0]}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                開始時刻 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange("startTime", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                終了時刻 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange("endTime", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              備考・理由
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={3}
              placeholder="シフト申請の理由や特記事項があれば記入してください"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
            >
              {isSubmitting ? "申請中..." : "申請する"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
