"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCastPerformanceFormSchema } from "@/lib/validations/cast";
import { CastService } from "@/services/cast.service";
import type { CreateCastPerformanceFormInput } from "@/lib/validations/cast";
import { format } from "date-fns";

interface CastPerformanceFormProps {
  castId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CastPerformanceForm({
  castId,
  onSuccess,
  onCancel,
}: CastPerformanceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCastPerformanceFormInput>({
    resolver: zodResolver(createCastPerformanceFormSchema),
    defaultValues: {
      castId,
      date: format(new Date(), "yyyy-MM-dd"),
      shimeiCount: 0,
      dohanCount: 0,
      salesAmount: 0,
      drinkCount: 0,
    },
  });

  const onSubmit = async (data: CreateCastPerformanceFormInput) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const castService = new CastService();
      await castService.createCastPerformance(data);

      reset();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register("castId")} />

      <div>
        <label
          htmlFor="date"
          className="block text-sm font-medium text-gray-700"
        >
          日付
        </label>
        <input
          type="date"
          id="date"
          {...register("date")}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.date && (
          <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="shimeiCount"
            className="block text-sm font-medium text-gray-700"
          >
            指名数
          </label>
          <input
            type="number"
            id="shimeiCount"
            min="0"
            {...register("shimeiCount", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.shimeiCount && (
            <p className="mt-1 text-sm text-red-600">
              {errors.shimeiCount.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="dohanCount"
            className="block text-sm font-medium text-gray-700"
          >
            同伴数
          </label>
          <input
            type="number"
            id="dohanCount"
            min="0"
            {...register("dohanCount", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.dohanCount && (
            <p className="mt-1 text-sm text-red-600">
              {errors.dohanCount.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="salesAmount"
            className="block text-sm font-medium text-gray-700"
          >
            売上金額（円）
          </label>
          <input
            type="number"
            id="salesAmount"
            min="0"
            {...register("salesAmount", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.salesAmount && (
            <p className="mt-1 text-sm text-red-600">
              {errors.salesAmount.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="drinkCount"
            className="block text-sm font-medium text-gray-700"
          >
            ドリンク数
          </label>
          <input
            type="number"
            id="drinkCount"
            min="0"
            {...register("drinkCount", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.drinkCount && (
            <p className="mt-1 text-sm text-red-600">
              {errors.drinkCount.message}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "記録中..." : "記録する"}
        </button>
      </div>
    </form>
  );
}
