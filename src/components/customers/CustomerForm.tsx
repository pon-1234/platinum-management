"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCustomerFormSchema,
  updateCustomerFormSchema,
  type CreateCustomerInput,
} from "@/lib/validations/customer";
import type { Customer, CustomerStatus } from "@/types/customer.types";

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CreateCustomerInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const statusOptions: { value: CustomerStatus; label: string }[] = [
  { value: "normal", label: "通常" },
  { value: "vip", label: "VIP" },
  { value: "caution", label: "要注意" },
  { value: "blacklisted", label: "ブラックリスト" },
];

export function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isLoading = false,
}: CustomerFormProps) {
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(
      isEdit ? updateCustomerFormSchema : createCustomerFormSchema
    ) as unknown as Parameters<
      typeof useForm<CreateCustomerInput>
    >[0]["resolver"],
    defaultValues: customer
      ? {
          name: customer.name,
          nameKana: customer.nameKana || "",
          phoneNumber: customer.phoneNumber || "",
          lineId: customer.lineId || "",
          birthday: customer.birthday || "",
          memo: customer.memo || "",
          status: customer.status,
        }
      : {
          status: "normal",
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            名前 <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <input
              type="text"
              {...register("name")}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="nameKana"
            className="block text-sm font-medium text-gray-700"
          >
            フリガナ
          </label>
          <div className="mt-1">
            <input
              type="text"
              {...register("nameKana")}
              placeholder="カタカナで入力"
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
            {errors.nameKana && (
              <p className="mt-1 text-sm text-red-600">
                {errors.nameKana.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="phoneNumber"
            className="block text-sm font-medium text-gray-700"
          >
            電話番号
          </label>
          <div className="mt-1">
            <input
              type="tel"
              {...register("phoneNumber")}
              placeholder="090-1234-5678"
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="lineId"
            className="block text-sm font-medium text-gray-700"
          >
            LINE ID
          </label>
          <div className="mt-1">
            <input
              type="text"
              {...register("lineId")}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
            {errors.lineId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.lineId.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="birthday"
            className="block text-sm font-medium text-gray-700"
          >
            誕生日
          </label>
          <div className="mt-1">
            <input
              type="date"
              {...register("birthday")}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
            {errors.birthday && (
              <p className="mt-1 text-sm text-red-600">
                {errors.birthday.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700"
          >
            ステータス
          </label>
          <div className="mt-1">
            <select
              {...register("status")}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="memo"
            className="block text-sm font-medium text-gray-700"
          >
            メモ
          </label>
          <div className="mt-1">
            <textarea
              {...register("memo")}
              rows={3}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
            {errors.memo && (
              <p className="mt-1 text-sm text-red-600">{errors.memo.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "保存中..." : isEdit ? "更新" : "登録"}
        </button>
      </div>
    </form>
  );
}
