"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Users, Phone, Check, X } from "lucide-react";
import { ReservationService } from "@/services/reservation.service";
import { CustomerService } from "@/services/customer.service";
import { TableService } from "@/services/table.service";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { ReservationWithDetails, Table } from "@/types/reservation.types";
import type { Customer } from "@/types/customer.types";

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
  const [customerMap, setCustomerMap] = useState<Record<string, Customer>>({});
  const [tableMap, setTableMap] = useState<Record<string, Table>>({});

  const reservationService = new ReservationService();
  const customerService = new CustomerService();
  const tableService = new TableService();

  useEffect(() => {
    loadReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, status]);

  const loadReservations = async () => {
    setIsLoading(true);
    try {
      const data = await reservationService.searchReservations({
        startDate: date,
        endDate: date,
        status,
      });

      // Load customer and table details
      const customerIds = [...new Set(data.map((r) => r.customerId))];
      const tableIds = [...new Set(data.map((r) => r.tableId))];

      const [customers, tables] = await Promise.all([
        Promise.all(
          customerIds.map((id) => customerService.getCustomerById(id))
        ),
        Promise.all(tableIds.map((id) => tableService.getTableById(id))),
      ]);

      const customerMapData = customers.reduce(
        (acc, customer) => {
          if (customer) acc[customer.id] = customer;
          return acc;
        },
        {} as Record<string, Customer>
      );

      const tableMapData = tables.reduce(
        (acc, table) => {
          if (table) acc[table.id] = table;
          return acc;
        },
        {} as Record<string, Table>
      );

      setCustomerMap(customerMapData);
      setTableMap(tableMapData);
      setReservations(data);
    } catch (error) {
      console.error("Failed to load reservations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async (reservation: ReservationWithDetails) => {
    try {
      await reservationService.checkInReservation(reservation.id);
      await loadReservations();
    } catch (error) {
      console.error("Failed to check in reservation:", error);
      alert("チェックインに失敗しました");
    }
  };

  const handleCancel = async (reservation: ReservationWithDetails) => {
    const reason = prompt("キャンセル理由を入力してください");
    if (!reason) return;

    try {
      await reservationService.cancelReservation(reservation.id, reason);
      await loadReservations();
    } catch (error) {
      console.error("Failed to cancel reservation:", error);
      alert("キャンセルに失敗しました");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-gray-100 text-gray-800", label: "未確認" },
      confirmed: { color: "bg-blue-100 text-blue-800", label: "確認済" },
      checked_in: { color: "bg-green-100 text-green-800", label: "来店済" },
      cancelled: { color: "bg-red-100 text-red-800", label: "キャンセル" },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
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
        const customer = customerMap[reservation.customerId];
        const table = tableMap[reservation.tableId];

        return (
          <div
            key={reservation.id}
            className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
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
                    {table.isVip && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        VIP
                      </span>
                    )}
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
          </div>
        );
      })}
    </div>
  );
}
