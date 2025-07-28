"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Users, Phone, Check, X } from "lucide-react";
import { reservationService } from "@/services/reservation.service";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { ReservationWithDetails } from "@/types/reservation.types";
import { toast } from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface ReservationListProps {
  date?: string;
  status?: "pending" | "confirmed" | "checked_in" | "cancelled";
  onReservationSelect?: (reservation: ReservationWithDetails) => void;
}

export function ReservationList({
  date,
  status,
  onReservationSelect,
}: ReservationListProps) {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, status]);

  const loadReservations = async () => {
    setIsLoading(true);
    try {
      const data = await reservationService.searchReservationsWithDetails({
        startDate: date,
        endDate: date,
        status,
        limit: 100,
        offset: 0,
      });

      setReservations(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to load reservations:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async (reservation: ReservationWithDetails) => {
    try {
      // Use the table ID from the reservation, or require user to select
      const tableId = reservation.tableId || "1"; // Default table or let user select
      await reservationService.checkInReservation(reservation.id, tableId);
      await loadReservations();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to check in reservation:", error);
      }
      toast.error("チェックインに失敗しました");
    }
  };

  const handleCancel = async (reservation: ReservationWithDetails) => {
    const reason = prompt("キャンセル理由を入力してください");
    if (!reason) return;

    try {
      await reservationService.cancelReservation(reservation.id, reason);
      await loadReservations();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to cancel reservation:", error);
      }
      toast.error("キャンセルに失敗しました");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "default" as const, label: "未確認" },
      confirmed: { variant: "info" as const, label: "確認済" },
      checked_in: { variant: "success" as const, label: "来店済" },
      cancelled: { variant: "error" as const, label: "キャンセル" },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <StatusBadge variant={config.variant}>{config.label}</StatusBadge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        予約がありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reservations.map((reservation) => {
        const customer = reservation.customer;
        const table = reservation.table;

        return (
          <Card
            key={reservation.id}
            hover={true}
            onClick={() => onReservationSelect?.(reservation)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {customer?.name || "不明な顧客"}
                  </h3>
                  {getStatusBadge(reservation.status)}
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {format(
                      new Date(reservation.reservationDate),
                      "yyyy年MM月dd日",
                      { locale: ja }
                    )}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {reservation.reservationTime.slice(0, 5)}
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {reservation.numberOfGuests}名
                  </div>
                  {customer?.phoneNumber && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      {customer.phoneNumber}
                    </div>
                  )}
                </div>

                {table && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">テーブル:</span>{" "}
                    {table.tableName}
                  </div>
                )}

                {reservation.specialRequests && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">特記事項:</span>{" "}
                    {reservation.specialRequests}
                  </div>
                )}
              </div>

              {reservation.status === "confirmed" && (
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckIn(reservation);
                    }}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="チェックイン"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel(reservation);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="キャンセル"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
