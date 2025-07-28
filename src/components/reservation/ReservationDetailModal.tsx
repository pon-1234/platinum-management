"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { reservationService } from "@/services/reservation.service";
import { customerService } from "@/services/customer.service";
import { castService } from "@/services/cast.service";
import { updateReservationSchema } from "@/lib/validations/reservation";
import type { UpdateReservationInput } from "@/lib/validations/reservation";
import type { ReservationWithDetails } from "@/types/reservation.types";
import type { Customer } from "@/types/customer.types";
import type { Cast } from "@/types/cast.types";
import type { Table } from "@/types/reservation.types";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Calendar,
  Clock,
  Users,
  Phone,
  Edit2,
  Check,
  X,
  User,
  MapPin,
} from "lucide-react";

interface ReservationDetailModalProps {
  reservation: ReservationWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReservationDetailModal({
  reservation,
  isOpen,
  onClose,
  onSuccess,
}: ReservationDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [casts, setCasts] = useState<Cast[]>([]);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setValue,
  } = useForm({
    resolver: zodResolver(updateReservationSchema),
  });

  const watchedDate = watch("reservationDate");
  const watchedTime = watch("reservationTime");

  useEffect(() => {
    if (isOpen && reservation) {
      reset({
        customerId: reservation.customerId,
        tableId: reservation.tableId,
        reservationDate: reservation.reservationDate,
        reservationTime: reservation.reservationTime,
        numberOfGuests: reservation.numberOfGuests,
        assignedCastId: reservation.assignedCastId,
        specialRequests: reservation.specialRequests,
        status: reservation.status,
      });

      if (isEditing) {
        loadEditingData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reservation, isEditing, reset]);

  useEffect(() => {
    if (isEditing && watchedDate && watchedTime && reservation) {
      // Only load tables if date/time changed
      if (
        watchedDate !== reservation.reservationDate ||
        watchedTime !== reservation.reservationTime
      ) {
        loadAvailableTables();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, watchedDate, watchedTime, reservation]);

  const loadEditingData = async () => {
    setIsLoadingData(true);
    try {
      const [customersData, castsData] = await Promise.all([
        customerService.searchCustomers({ limit: 100, offset: 0 }),
        castService.searchCasts({ isActive: true, limit: 50 }),
      ]);

      setCustomers(customersData);
      setCasts(castsData);

      // Load current tables if reservation has date/time
      if (reservation?.reservationDate && reservation?.reservationTime) {
        const tables = await reservationService.getAvailableTables(
          reservation.reservationDate,
          reservation.reservationTime
        );
        // Include current table even if it's not available for new bookings
        if (
          reservation.table &&
          !tables.find((t) => t.id === reservation.table?.id)
        ) {
          tables.unshift(reservation.table);
        }
        setAvailableTables(tables);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to load editing data:", error);
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
      // Include current table even if it's not available for new bookings
      if (
        reservation?.table &&
        !tables.find((t) => t.id === reservation.table?.id)
      ) {
        tables.unshift(reservation.table);
      }
      setAvailableTables(tables);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to load available tables:", error);
      }
    }
  };

  const onSubmit = async (data: UpdateReservationInput) => {
    if (!reservation) return;

    setIsLoading(true);
    try {
      await reservationService.updateReservation(reservation.id, data);
      toast.success("予約を更新しました");
      setIsEditing(false);
      onSuccess();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to update reservation:", error);
      }
      toast.error("予約の更新に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!reservation) return;

    const tableId =
      reservation.tableId || prompt("テーブルIDを入力してください");
    if (!tableId) {
      toast.error("テーブルが指定されていません");
      return;
    }

    try {
      await reservationService.checkInReservation(reservation.id, tableId);
      toast.success("チェックインしました");
      onSuccess();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to check in reservation:", error);
      }
      toast.error("チェックインに失敗しました");
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;

    const reason = prompt("キャンセル理由を入力してください");
    if (!reason) return;

    try {
      await reservationService.cancelReservation(reservation.id, reason);
      toast.success("予約をキャンセルしました");
      onSuccess();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to cancel reservation:", error);
      }
      toast.error("キャンセルに失敗しました");
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "default" as const, label: "未確認" },
      confirmed: { variant: "info" as const, label: "確認済" },
      checked_in: { variant: "success" as const, label: "来店済" },
      completed: { variant: "success" as const, label: "完了" },
      cancelled: { variant: "error" as const, label: "キャンセル" },
      no_show: { variant: "error" as const, label: "No Show" },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <StatusBadge variant={config.variant}>{config.label}</StatusBadge>;
  };

  if (!reservation) {
    return null;
  }

  if (isLoadingData) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="予約詳細" size="lg">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="予約詳細" size="lg">
      {!isEditing ? (
        /* 詳細表示モード */
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-medium text-gray-900">
                {reservation.customer?.name || "不明な顧客"}
              </h3>
              {getStatusBadge(reservation.status)}
            </div>
            <div className="flex space-x-2">
              {reservation.status === "confirmed" && (
                <button
                  onClick={handleCheckIn}
                  className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  チェックイン
                </button>
              )}
              {["pending", "confirmed"].includes(reservation.status) && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    編集
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    <X className="w-4 h-4 mr-1" />
                    キャンセル
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 予約情報 */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center text-gray-600">
                <Calendar className="w-5 h-5 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">予約日</p>
                  <p className="font-medium">
                    {format(
                      new Date(reservation.reservationDate),
                      "yyyy年MM月dd日",
                      { locale: ja }
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center text-gray-600">
                <Clock className="w-5 h-5 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">予約時間</p>
                  <p className="font-medium">{reservation.reservationTime}</p>
                </div>
              </div>

              <div className="flex items-center text-gray-600">
                <Users className="w-5 h-5 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">人数</p>
                  <p className="font-medium">{reservation.numberOfGuests}名</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {reservation.customer?.phoneNumber && (
                <div className="flex items-center text-gray-600">
                  <Phone className="w-5 h-5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">電話番号</p>
                    <p className="font-medium">
                      {reservation.customer.phoneNumber}
                    </p>
                  </div>
                </div>
              )}

              {reservation.table && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-5 h-5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">テーブル</p>
                    <p className="font-medium">{reservation.table.tableName}</p>
                  </div>
                </div>
              )}

              {reservation.assignedCast && (
                <div className="flex items-center text-gray-600">
                  <User className="w-5 h-5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">指名キャスト</p>
                    <p className="font-medium">
                      {reservation.assignedCast.stageName}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 特記事項 */}
          {reservation.specialRequests && (
            <div>
              <p className="text-sm text-gray-500 mb-2">特記事項</p>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                {reservation.specialRequests}
              </p>
            </div>
          )}

          {/* キャンセル情報 */}
          {reservation.status === "cancelled" && reservation.cancelReason && (
            <div>
              <p className="text-sm text-gray-500 mb-2">キャンセル理由</p>
              <p className="text-red-700 bg-red-50 p-3 rounded-md">
                {reservation.cancelReason}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* 編集モード */
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
              <option value="">テーブルを選択してください</option>
              {availableTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.tableName} (定員: {table.capacity}名)
                </option>
              ))}
            </select>
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
          </div>

          {/* 特記事項 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              特記事項
            </label>
            <textarea
              {...register("specialRequests")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
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
              <option value="checked_in">来店済</option>
              <option value="completed">完了</option>
              <option value="cancelled">キャンセル</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md"
            >
              {isLoading ? "更新中..." : "更新"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
