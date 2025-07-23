"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner, ErrorMessage } from "@/components/common";
import { useFormValidation } from "@/hooks/useFormValidation";
import { castService } from "@/services/cast.service";
import { staffService } from "@/services/staff.service";
import type { Staff } from "@/types/staff.types";
import { z } from "zod";
import { usePermission } from "@/hooks/usePermission";

// Validation schema
const castRegistrationSchema = z.object({
  staffId: z.string().min(1, "スタッフを選択してください"),
  stageName: z
    .string()
    .min(1, "源氏名は必須です")
    .max(50, "源氏名は50文字以内で入力してください"),
  hourlyRate: z
    .number()
    .min(1000, "時給は1000円以上で設定してください")
    .max(10000, "時給は10000円以下で設定してください"),
  backPercentage: z
    .number()
    .min(0, "バック率は0%以上で設定してください")
    .max(100, "バック率は100%以下で設定してください"),
  memo: z.string().max(500, "メモは500文字以内で入力してください").optional(),
});

type CastRegistrationData = z.infer<typeof castRegistrationSchema>;

interface CastRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CastRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
}: CastRegistrationModalProps) {
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { can } = usePermission();
  const canCreateCast = can("cast", "create");

  const form = useFormValidation<CastRegistrationData>({
    schema: castRegistrationSchema,
    defaultValues: {
      staffId: "",
      stageName: "",
      hourlyRate: 3000,
      backPercentage: 50,
      memo: "",
    },
  });

  // Load available staff when modal opens
  const loadAvailableStaff = useCallback(async () => {
    setIsLoadingStaff(true);
    try {
      // Use client-side service with better error handling
      const result = await staffService.getUnregisteredStaff(1, 100);

      // Filter out admin role
      const available = result.data.filter(
        (staff: Staff) => staff.role !== "admin" // Don't allow admin to be cast
      );

      setAvailableStaff(available);
    } catch (error) {
      console.error("Failed to load available staff:", error);
      // より詳細なエラー情報を表示
      const errorMessage =
        error instanceof Error
          ? error.message
          : "スタッフ情報の読み込みに失敗しました";

      form.setError("root", {
        message: `スタッフ情報の読み込みエラー: ${errorMessage}`,
      });
    } finally {
      setIsLoadingStaff(false);
    }
  }, [form]);

  useEffect(() => {
    if (isOpen && canCreateCast) {
      loadAvailableStaff();
      form.reset(); // Reset form when opening
    }
  }, [isOpen, form, loadAvailableStaff, canCreateCast]);

  const handleSubmit = async (data: CastRegistrationData) => {
    setIsSubmitting(true);
    try {
      await castService.createCast({
        staffId: data.staffId,
        stageName: data.stageName,
        hourlyRate: data.hourlyRate,
        backPercentage: data.backPercentage,
        memo: data.memo || "",
        isActive: true,
      });

      onSuccess();
    } catch (error) {
      console.error("Failed to create cast:", error);
      form.setError("root", {
        message: "キャストの登録に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="新規キャスト登録" size="md">
      {!canCreateCast ? (
        <div className="text-center py-8">
          <p className="text-gray-600">キャストを登録する権限がありません。</p>
        </div>
      ) : (
        <form
          onSubmit={form.handleAsyncSubmit(handleSubmit)}
          className="space-y-6"
        >
          {/* Root Error */}
          {form.formState.errors.root && (
            <ErrorMessage message={form.formState.errors.root.message!} />
          )}

          {/* Staff Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              スタッフ選択 <span className="text-red-500">*</span>
            </label>
            {isLoadingStaff ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <select
                {...form.register("staffId")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">スタッフを選択してください</option>
                {availableStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.fullName} ({staff.role})
                  </option>
                ))}
              </select>
            )}
            {form.formState.errors.staffId && (
              <ErrorMessage message={form.formState.errors.staffId.message!} />
            )}
          </div>

          {/* Stage Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              源氏名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...form.register("stageName")}
              placeholder="例: さくら"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {form.formState.errors.stageName && (
              <ErrorMessage
                message={form.formState.errors.stageName.message!}
              />
            )}
          </div>

          {/* Hourly Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              時給（円） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              {...form.register("hourlyRate", { valueAsNumber: true })}
              min="1000"
              max="10000"
              step="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {form.formState.errors.hourlyRate && (
              <ErrorMessage
                message={form.formState.errors.hourlyRate.message!}
              />
            )}
          </div>

          {/* Back Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              バック率（%） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              {...form.register("backPercentage", { valueAsNumber: true })}
              min="0"
              max="100"
              step="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              売上に対するバック率を設定してください
            </p>
            {form.formState.errors.backPercentage && (
              <ErrorMessage
                message={form.formState.errors.backPercentage.message!}
              />
            )}
          </div>

          {/* Memo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メモ
            </label>
            <textarea
              {...form.register("memo")}
              rows={3}
              placeholder="特記事項があれば入力してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {form.formState.errors.memo && (
              <ErrorMessage message={form.formState.errors.memo.message!} />
            )}
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
              disabled={isSubmitting || isLoadingStaff}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {isSubmitting && <LoadingSpinner size="sm" />}
              {isSubmitting ? "登録中..." : "登録"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
