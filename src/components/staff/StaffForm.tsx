"use client";

import { useState } from "react";
import { Staff, CreateStaffData, UpdateStaffData } from "@/types/staff.types";
import { UserRole } from "@/types/auth.types";

interface StaffFormProps {
  staff?: Staff;
  onSubmit: (data: CreateStaffData | UpdateStaffData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function StaffForm({ staff, onSubmit, onCancel, isLoading }: StaffFormProps) {
  const [formData, setFormData] = useState({
    userId: staff?.userId || "",
    fullName: staff?.fullName || "",
    role: staff?.role || "hall" as UserRole,
    hireDate: staff?.hireDate || new Date().toISOString().split("T")[0],
    isActive: staff?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "名前は必須です";
    }

    if (!staff && !formData.userId.trim()) {
      newErrors.userId = "ユーザーIDは必須です";
    }

    if (!formData.hireDate) {
      newErrors.hireDate = "雇用日は必須です";
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
      if (staff) {
        // Update existing staff
        await onSubmit({
          fullName: formData.fullName,
          role: formData.role,
          isActive: formData.isActive,
        } as UpdateStaffData);
      } else {
        // Create new staff
        await onSubmit({
          userId: formData.userId,
          fullName: formData.fullName,
          role: formData.role,
          hireDate: formData.hireDate,
        } as CreateStaffData);
      }
    } catch (error) {
      console.error("Failed to submit staff form:", error);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {staff ? "スタッフ情報編集" : "新規スタッフ登録"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              スタッフの基本情報を入力してください。
            </p>
          </div>
          <div className="mt-5 space-y-6 md:col-span-2 md:mt-0">
            {!staff && (
              <div>
                <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                  ユーザーID
                </label>
                <input
                  type="text"
                  name="userId"
                  id="userId"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                    errors.userId ? "border-red-300" : ""
                  }`}
                  disabled={isLoading}
                />
                {errors.userId && (
                  <p className="mt-2 text-sm text-red-600">{errors.userId}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                名前
              </label>
              <input
                type="text"
                name="fullName"
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.fullName ? "border-red-300" : ""
                }`}
                disabled={isLoading}
              />
              {errors.fullName && (
                <p className="mt-2 text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                役職
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={isLoading}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700">
                雇用日
              </label>
              <input
                type="date"
                name="hireDate"
                id="hireDate"
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.hireDate ? "border-red-300" : ""
                }`}
                disabled={isLoading || !!staff}
              />
              {errors.hireDate && (
                <p className="mt-2 text-sm text-red-600">{errors.hireDate}</p>
              )}
            </div>

            {staff && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ステータス
                </label>
                <div className="mt-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
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
          disabled={isLoading}
          className="rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? "保存中..." : staff ? "更新" : "登録"}
        </button>
      </div>
    </form>
  );
}