"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner, ErrorMessage } from "@/components/common";
import { useFormValidation } from "@/hooks/useFormValidation";
import { castService } from "@/services/cast.service";
import { getAvailableStaffForCast } from "@/app/actions/staff.actions";
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

interface AvailableStaff {
  id: string;
  fullName: string;
  fullNameKana: string;
  role: string;
  status: string;
}

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
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);
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
  useEffect(() => {
    if (isOpen && canCreateCast) {
      setIsLoadingStaff(true);
      getAvailableStaffForCast()
        .then((staff) => {
          setAvailableStaff(staff);
        })
        .catch((error) => {
          console.error("Failed to load available staff:", error);
          form.setError("root", {
            message: "スタッフ情報の読み込みに失敗しました",
          });
        })
        .finally(() => {
          setIsLoadingStaff(false);
        });

      form.reset(); // Reset form when opening
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, canCreateCast]); // Remove form from dependencies to avoid infinite loop

  const handleSubmit = async (data: CastRegistrationData) => {
    setIsSubmitting(true);
    console.log("CastRegistrationModal: Submitting cast data:", data);
    console.log(
      "CastRegistrationModal: staffId type and value:",
      typeof data.staffId,
      data.staffId
    );
    console.log("CastRegistrationModal: staffId length:", data.staffId.length);

    const castData = {
      staffId: data.staffId,
      stageName: data.stageName,
      hourlyRate: data.hourlyRate,
      backPercentage: data.backPercentage,
      selfIntroduction: data.memo || "",
      isActive: true,
    };

    console.log("CastRegistrationModal: Final cast data:", castData);

    try {
      await castService.createCast(castData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to register cast:", error);
      form.setError("root", {
        message: "キャストの登録に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreateCast) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="キャスト新規登録" size="lg">
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
          <label
            htmlFor="staffId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            スタッフ選択 <span className="text-red-500">*</span>
          </label>
          {isLoadingStaff ? (
            <div className="mt-1 flex items-center justify-center p-8">
              <LoadingSpinner />
            </div>
          ) : (
            <select
              id="staffId"
              {...form.register("staffId")}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.staffId.message}
            </p>
          )}
        </div>

        {/* Stage Name */}
        <div>
          <label
            htmlFor="stageName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            源氏名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="stageName"
            {...form.register("stageName")}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="例: 愛香"
          />
          {form.formState.errors.stageName && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.stageName.message}
            </p>
          )}
        </div>

        {/* Hourly Rate */}
        <div>
          <label
            htmlFor="hourlyRate"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            時給（円） <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="hourlyRate"
            {...form.register("hourlyRate", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            min="1000"
            max="10000"
            step="100"
          />
          {form.formState.errors.hourlyRate && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.hourlyRate.message}
            </p>
          )}
        </div>

        {/* Back Percentage */}
        <div>
          <label
            htmlFor="backPercentage"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            バック率（%） <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="backPercentage"
            {...form.register("backPercentage", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            min="0"
            max="100"
            step="5"
          />
          {form.formState.errors.backPercentage && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.backPercentage.message}
            </p>
          )}
        </div>

        {/* Memo */}
        <div>
          <label
            htmlFor="memo"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            メモ
          </label>
          <textarea
            id="memo"
            {...form.register("memo")}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="特記事項があれば入力してください"
          />
          {form.formState.errors.memo && (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.memo.message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            disabled={isSubmitting}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || !form.formState.isValid}
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : "登録"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
