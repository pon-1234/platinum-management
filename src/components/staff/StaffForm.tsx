"use client";

import { Staff, CreateStaffData, UpdateStaffData } from "@/types/staff.types";
import { UserRole } from "@/types/auth.types";
import { useFormValidation } from "@/hooks/useFormValidation";
import { LoadingSpinner, ErrorMessage } from "@/components/common";
import {
  createStaffFormSchema,
  CreateStaffFormData,
} from "@/lib/validations/staff";

interface StaffFormProps {
  staff?: Staff;
  onSubmit: (data: CreateStaffData | UpdateStaffData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function StaffForm({
  staff,
  onSubmit,
  onCancel,
  isLoading,
}: StaffFormProps) {
  const isEditing = !!staff;

  // Use a single form schema that handles both cases
  const form = useFormValidation<CreateStaffFormData>({
    schema: createStaffFormSchema,
    defaultValues: {
      userId: staff ? "" : "",
      fullName: staff?.fullName || "",
      role: (staff?.role as UserRole) || "hall",
      hireDate: new Date().toISOString().split("T")[0],
      isActive: staff?.isActive ?? true,
    },
  });

  const handleSubmit = async (data: CreateStaffFormData) => {
    if (isEditing) {
      await onSubmit({
        fullName: data.fullName,
        role: data.role,
        isActive: data.isActive ?? true,
      } as UpdateStaffData);
    } else {
      await onSubmit({
        userId: data.userId,
        fullName: data.fullName,
        role: data.role,
        hireDate: data.hireDate,
      } as CreateStaffData);
    }
  };

  const roleOptions: { value: UserRole; label: string }[] = [
    { value: "admin", label: "管理者" },
    { value: "manager", label: "マネージャー" },
    { value: "hall", label: "ホールスタッフ" },
    { value: "cashier", label: "会計担当" },
    { value: "cast", label: "キャスト" },
  ];

  return (
    <form onSubmit={form.handleAsyncSubmit(handleSubmit)} className="space-y-6">
      {/* Root Error */}
      {form.formState.errors.root && (
        <ErrorMessage message={form.formState.errors.root.message!} />
      )}

      <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {isEditing ? "スタッフ情報編集" : "新規スタッフ登録"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              スタッフの基本情報を入力してください。
            </p>
          </div>
          <div className="mt-5 space-y-6 md:col-span-2 md:mt-0">
            {!isEditing && (
              <div>
                <label
                  htmlFor="userId"
                  className="block text-sm font-medium text-gray-700"
                >
                  ユーザーID
                </label>
                <input
                  type="text"
                  {...form.register("userId")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={isLoading}
                />
                {form.formState.errors.userId && (
                  <ErrorMessage
                    message={form.formState.errors.userId.message!}
                  />
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700"
              >
                名前
              </label>
              <input
                type="text"
                {...form.register("fullName")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={isLoading}
              />
              {form.formState.errors.fullName && (
                <ErrorMessage
                  message={form.formState.errors.fullName.message!}
                />
              )}
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700"
              >
                役職
              </label>
              <select
                {...form.register("role")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={isLoading}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.role && (
                <ErrorMessage message={form.formState.errors.role.message!} />
              )}
            </div>

            {!isEditing && (
              <div>
                <label
                  htmlFor="hireDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  雇用日
                </label>
                <input
                  type="date"
                  {...form.register("hireDate")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={isLoading}
                />
                {form.formState.errors.hireDate && (
                  <ErrorMessage
                    message={form.formState.errors.hireDate.message!}
                  />
                )}
              </div>
            )}

            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ステータス
                </label>
                <div className="mt-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      {...form.register("isActive")}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      disabled={isLoading}
                    />
                    <span className="ml-2 text-sm text-gray-700">有効</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isLoading || form.formState.isSubmitting}
          className="rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
        >
          {(isLoading || form.formState.isSubmitting) && (
            <LoadingSpinner size="sm" />
          )}
          {isLoading || form.formState.isSubmitting
            ? "保存中..."
            : isEditing
              ? "更新"
              : "登録"}
        </button>
      </div>
    </form>
  );
}
