"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReservationService } from "@/services/reservation.service";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ja } from "date-fns/locale";
import type { Reservation } from "@/types/reservation.types";

interface ReservationCalendarProps {
  onDateSelect?: (date: Date) => void;
  onReservationSelect?: (reservation: Reservation) => void;
}

export function ReservationCalendar({
  onDateSelect,
  onReservationSelect,
}: ReservationCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [reservationsByDate, setReservationsByDate] = useState<
    Record<string, Reservation[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  const reservationService = new ReservationService();

  useEffect(() => {
    loadMonthReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const loadMonthReservations = async () => {
    setIsLoading(true);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const reservations = await reservationService.searchReservations({
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
      });

      // Group reservations by date
      const grouped = reservations.reduce(
        (acc, reservation) => {
          const dateKey = reservation.reservationDate;
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
          acc[dateKey].push(reservation);
          return acc;
        },
        {} as Record<string, Reservation[]>
      );

      setReservationsByDate(grouped);
    } catch (error) {
      console.error("Failed to load reservations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Add padding days from previous month
    const startDay = getDay(start);
    const paddingDays = Array(startDay).fill(null);

    return [...paddingDays, ...days];
  };

  const getReservationCount = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return reservationsByDate[dateKey]?.length || 0;
  };

  const getReservationStatus = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const reservations = reservationsByDate[dateKey] || [];

    if (reservations.length === 0) return null;

    const hasCheckedIn = reservations.some((r) => r.status === "checked_in");
    const hasConfirmed = reservations.some((r) => r.status === "confirmed");
    const hasPending = reservations.some((r) => r.status === "pending");

    if (hasCheckedIn) return "checked_in";
    if (hasConfirmed) return "confirmed";
    if (hasPending) return "pending";

    return null;
  };

  const statusColors = {
    pending: "bg-yellow-200 dark:bg-yellow-800",
    confirmed: "bg-blue-200 dark:bg-blue-800",
    checked_in: "bg-green-200 dark:bg-green-800",
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {format(currentMonth, "yyyy年MM月", { locale: ja })}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday Headers */}
        {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-2 ${
              index === 0
                ? "text-red-600"
                : index === 6
                  ? "text-blue-600"
                  : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {getDaysInMonth().map((date, index) => {
          if (!date) {
            return <div key={`padding-${index}`} />;
          }

          const count = getReservationCount(date);
          const status = getReservationStatus(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const dayOfWeek = getDay(date);

          return (
            <button
              key={date.toString()}
              onClick={() => handleDateClick(date)}
              disabled={!isCurrentMonth}
              className={`
                relative p-2 h-20 border rounded-lg transition-all
                ${isCurrentMonth ? "hover:bg-gray-50 dark:hover:bg-gray-700" : "opacity-50 cursor-not-allowed"}
                ${isSelected ? "ring-2 ring-indigo-500" : ""}
                ${isToday(date) ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}
                ${dayOfWeek === 0 ? "text-red-600" : dayOfWeek === 6 ? "text-blue-600" : ""}
              `}
            >
              <div className="text-sm font-medium">{format(date, "d")}</div>

              {count > 0 && (
                <div className="mt-1">
                  <div
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || "bg-gray-200 dark:bg-gray-700"}`}
                  >
                    {count}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Reservations */}
      {selectedDate && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            {format(selectedDate, "MM月dd日", { locale: ja })}の予約
          </h3>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {reservationsByDate[format(selectedDate, "yyyy-MM-dd")]?.map(
                (reservation) => (
                  <button
                    key={reservation.id}
                    onClick={() => onReservationSelect?.(reservation)}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">
                          {reservation.reservationTime.slice(0, 5)}
                        </span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          {reservation.numberOfGuests}名
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          reservation.status === "checked_in"
                            ? "bg-green-100 text-green-800"
                            : reservation.status === "confirmed"
                              ? "bg-blue-100 text-blue-800"
                              : reservation.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {reservation.status === "checked_in"
                          ? "来店済"
                          : reservation.status === "confirmed"
                            ? "確認済"
                            : reservation.status === "cancelled"
                              ? "キャンセル"
                              : "未確認"}
                      </span>
                    </div>
                  </button>
                )
              ) || (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  予約はありません
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
