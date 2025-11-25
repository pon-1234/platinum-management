"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { reservationService } from "@/services/reservation.service";
import { useRouter } from "next/navigation";
import { customerService } from "@/services/customer.service";
import { castService } from "@/services/cast.service";
import { createReservationSchema } from "@/lib/validations/reservation";
import type { CreateReservationInput } from "@/lib/validations/reservation";
import type { Customer } from "@/types/customer.types";
import type { Cast } from "@/types/cast.types";
import type { Table } from "@/types/reservation.types";
import { toast } from "react-hot-toast";

interface CreateReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  initialCustomerId?: string;
}

export function CreateReservationModal({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialCustomerId,
}: CreateReservationModalProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      reservationDate: initialDate || new Date().toISOString().split("T")[0],
      status: "pending" as const,
    },
  });

  const watchedDate = watch("reservationDate");
  const watchedTime = watch("reservationTime");

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (initialDate) {
        setValue("reservationDate", initialDate);
      }
      if (initialCustomerId) {
        setValue("customerId", initialCustomerId);
      }
    }
  }, [isOpen, initialDate, initialCustomerId, setValue]);

  useEffect(() => {
    if (watchedDate && watchedTime) {
      loadAvailableTables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedDate, watchedTime]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      const supabase = createClient();
      const [customersData, castsData] = await Promise.all([
        customerService.searchCustomers(supabase, { limit: 100, offset: 0 }),
        castService.searchCasts({ isActive: true, limit: 50 }),
      ]);

      setCustomers(customersData);
      setCasts(castsData);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to load initial data:", error);
      }
      toast.error("データの読み込みに失敗しました");
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadAvailableTables = async () => {
    if (!watchedDate || !watchedTime) return;

    try {
      const tables = await reservationService.getAvailableTables(
        watchedDate,
        watchedTime
      );
      setAvailableTables(tables);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to load available tables:", error);
      }
    }
  };

  const onSubmit = async (data: CreateReservationInput) => {
    setIsLoading(true);
    try {
      await reservationService.createReservation(data);
      router.refresh();
      toast.success("予約を作成しました");
      reset();
      onSuccess();
      onClose();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to create reservation:", error);
      }
      toast.error("予約の作成に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (isLoadingData) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="新規予約作成"
        size="lg"
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="新規予約作成" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 顧客選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            顧客 <span className="text-red-500">*</span>
          </label>
          <select
            {...register("customerId")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">顧客を選択してください</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}{" "}
                {customer.phoneNumber && `(${customer.phoneNumber})`}
              </option>
            ))}
          </select>
          {errors.customerId && (
            <p className="mt-1 text-sm text-red-600">
              {errors.customerId.message}
            </p>
          )}
        </div>

        {/* 予約日時 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              予約日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register("reservationDate")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.reservationDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.reservationDate.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              予約時間 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              {...register("reservationTime")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.reservationTime && (
              <p className="mt-1 text-sm text-red-600">
                {errors.reservationTime.message}
              </p>
            )}
          </div>
        </div>

        {/* 人数 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            人数 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="20"
            {...register("numberOfGuests", { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.numberOfGuests && (
            <p className="mt-1 text-sm text-red-600">
              {errors.numberOfGuests.message}
            </p>
          )}
        </div>

        {/* テーブル選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            テーブル
          </label>
          <select
            {...register("tableId")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">テーブルを選択してください（後で指定可能）</option>
            {availableTables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.tableName} (定員: {table.capacity}名)
              </option>
            ))}
          </select>
          {errors.tableId && (
            <p className="mt-1 text-sm text-red-600">
              {errors.tableId.message}
            </p>
          )}
        </div>

        {/* キャスト指名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            指名キャスト
          </label>
          <select
            {...register("assignedCastId")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">指名なし</option>
            {casts.map((cast) => (
              <option key={cast.id} value={cast.id}>
                {cast.stageName}
              </option>
            ))}
          </select>
          {errors.assignedCastId && (
            <p className="mt-1 text-sm text-red-600">
              {errors.assignedCastId.message}
            </p>
          )}
        </div>

        {/* 特記事項 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            特記事項
          </label>
          <textarea
            {...register("specialRequests")}
            rows={3}
            placeholder="アレルギー、記念日、その他の要望など"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.specialRequests && (
            <p className="mt-1 text-sm text-red-600">
              {errors.specialRequests.message}
            </p>
          )}
        </div>

        {/* 予約ステータス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ステータス
          </label>
          <select
            {...register("status")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="pending">未確認</option>
            <option value="confirmed">確認済</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>

        {/* ボタン */}
        <div className="flex justify-end space-x-3 pt-6">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isLoading ? "作成中..." : "予約作成"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
