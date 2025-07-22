"use client";

import { useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner, ErrorMessage } from "@/components/common";
import { useFormValidation } from "@/hooks/useFormValidation";
import { castService } from "@/services/cast.service";
import { z } from "zod";
import type { Cast } from "@/types/cast.types";

// Validation schema for editing cast
const castEditSchema = z.object({
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
  birthday: z.string().optional(),
  bloodType: z.enum(["A", "B", "O", "AB", ""]).optional(),
  height: z.number().min(140).max(200).optional().nullable(),
  threeSize: z.string().max(20).optional(),
  hobby: z.string().max(200).optional(),
  specialSkill: z.string().max(200).optional(),
  selfIntroduction: z.string().max(500).optional(),
  profileImageUrl: z.string().url().optional().or(z.literal("")),
  memo: z.string().max(500).optional(),
  isActive: z.boolean(),
});

type CastEditData = z.infer<typeof castEditSchema>;

interface CastEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cast: Cast;
}

export function CastEditModal({
  isOpen,
  onClose,
  onSuccess,
  cast,
}: CastEditModalProps) {
  const form = useFormValidation<CastEditData>({
    schema: castEditSchema,
    defaultValues: {
      stageName: "",
      hourlyRate: 3000,
      backPercentage: 50,
      birthday: "",
      bloodType: "",
      height: null,
      threeSize: "",
      hobby: "",
      specialSkill: "",
      selfIntroduction: "",
      profileImageUrl: "",
      memo: "",
      isActive: true,
    },
  });

  // Reset form when cast changes or modal opens
  useEffect(() => {
    if (isOpen && cast) {
      form.reset({
        stageName: cast.stageName || "",
        hourlyRate: cast.hourlyRate || 3000,
        backPercentage: cast.backPercentage || 50,
        birthday: cast.birthday || "",
        bloodType: (cast.bloodType as any) || "",
        height: cast.height,
        threeSize: cast.threeSize || "",
        hobby: cast.hobby || "",
        specialSkill: cast.specialSkill || "",
        selfIntroduction: cast.selfIntroduction || "",
        profileImageUrl: cast.profileImageUrl || "",
        memo: cast.memo || "",
        isActive: cast.isActive,
      });
    }
  }, [isOpen, cast, form]);

  const handleSubmit = async (data: CastEditData) => {
    try {
      await castService.updateCast(cast.id, {
        stageName: data.stageName,
        hourlyRate: data.hourlyRate,
        backPercentage: data.backPercentage,
        birthday: data.birthday || null,
        bloodType: data.bloodType || null,
        height: data.height,
        threeSize: data.threeSize || null,
        hobby: data.hobby || null,
        specialSkill: data.specialSkill || null,
        selfIntroduction: data.selfIntroduction || null,
        profileImageUrl: data.profileImageUrl || null,
        memo: data.memo || null,
        isActive: data.isActive,
      });

      onSuccess();
    } catch (error) {
      console.error("Failed to update cast:", error);
      form.setError("root", {
        message: "キャスト情報の更新に失敗しました",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${cast?.stageName} の情報編集`}
      size="lg"
    >
      <form
        onSubmit={form.handleAsyncSubmit(handleSubmit)}
        className="space-y-6"
      >
        {/* Root Error */}
        {form.formState.errors.root && (
          <ErrorMessage message={form.formState.errors.root.message!} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">基本情報</h3>

            {/* Stage Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                源氏名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...form.register("stageName")}
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
              {form.formState.errors.backPercentage && (
                <ErrorMessage
                  message={form.formState.errors.backPercentage.message!}
                />
              )}
            </div>

            {/* Birthday */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                誕生日
              </label>
              <input
                type="date"
                {...form.register("birthday")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Blood Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                血液型
              </label>
              <select
                {...form.register("bloodType")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">選択してください</option>
                <option value="A">A型</option>
                <option value="B">B型</option>
                <option value="O">O型</option>
                <option value="AB">AB型</option>
              </select>
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">プロフィール</h3>

            {/* Height */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                身長（cm）
              </label>
              <input
                type="number"
                {...form.register("height", {
                  valueAsNumber: true,
                  setValueAs: (v) => (v === "" ? null : Number(v)),
                })}
                min="140"
                max="200"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Three Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                スリーサイズ
              </label>
              <input
                type="text"
                {...form.register("threeSize")}
                placeholder="例: B88-W58-H85"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Hobby */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                趣味
              </label>
              <input
                type="text"
                {...form.register("hobby")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Special Skill */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                特技
              </label>
              <input
                type="text"
                {...form.register("specialSkill")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Profile Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                プロフィール画像URL
              </label>
              <input
                type="url"
                {...form.register("profileImageUrl")}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Self Introduction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            自己紹介
          </label>
          <textarea
            {...form.register("selfIntroduction")}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Memo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            メモ
          </label>
          <textarea
            {...form.register("memo")}
            rows={2}
            placeholder="管理用メモ"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
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
            無効にするとキャスト一覧に表示されなくなります
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
            {form.formState.isSubmitting ? "更新中..." : "更新"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
