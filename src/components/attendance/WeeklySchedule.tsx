"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { format, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { attendanceService } from "@/services/attendance.service";
import { ShiftDetailModal } from "./ShiftDetailModal";
import { AddShiftModal } from "./AddShiftModal";
import type {
  WeeklySchedule as WeeklyScheduleType,
  CalendarShift,
} from "@/types/attendance.types";

interface WeeklyScheduleProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function WeeklySchedule({
  selectedDate,
  onDateChange,
}: WeeklyScheduleProps) {
  const [weeklyData, setWeeklyData] = useState<WeeklyScheduleType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const start = startOfWeek(new Date(selectedDate), { weekStartsOn: 0 });
    return format(start, "yyyy-MM-dd");
  });

  // Modal states
  const [isShiftDetailModalOpen, setIsShiftDetailModalOpen] = useState(false);
  const [isAddShiftModalOpen, setIsAddShiftModalOpen] = useState(false);
  const [isEditShiftModalOpen, setIsEditShiftModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<CalendarShift | null>(
    null
  );
  const [selectedDateForAdd, setSelectedDateForAdd] = useState<string>("");

  const loadWeeklySchedule = useCallback(async (weekStart: string) => {
    try {
      setIsLoading(true);
      const data = await attendanceService.getWeeklySchedule(weekStart);
      setWeeklyData(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("週間スケジュールの読み込みに失敗しました:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeeklySchedule(currentWeekStart);
  }, [currentWeekStart, loadWeeklySchedule]);

  const navigateWeek = (direction: "prev" | "next") => {
    const currentDate = new Date(currentWeekStart);
    const newDate =
      direction === "prev"
        ? subWeeks(currentDate, 1)
        : addWeeks(currentDate, 1);
    const newWeekStart = format(
      startOfWeek(newDate, { weekStartsOn: 0 }),
      "yyyy-MM-dd"
    );
    setCurrentWeekStart(newWeekStart);
  };

  const goToToday = () => {
    const today = new Date();
    const weekStart = format(
      startOfWeek(today, { weekStartsOn: 0 }),
      "yyyy-MM-dd"
    );
    setCurrentWeekStart(weekStart);
    onDateChange(format(today, "yyyy-MM-dd"));
  };

  const handleShiftClick = (shift: CalendarShift) => {
    setSelectedShift(shift);
    setIsShiftDetailModalOpen(true);
  };

  const handleAddShiftClick = (date: string) => {
    setSelectedDateForAdd(date);
    setIsAddShiftModalOpen(true);
  };

  const handleShiftModalSuccess = () => {
    // データを再読み込み
    loadWeeklySchedule(currentWeekStart);
  };

  const handleEditShift = (shift: CalendarShift) => {
    setSelectedShift(shift);
    setIsShiftDetailModalOpen(false);
    setIsEditShiftModalOpen(true);
  };

  const handleDeleteShift = async (shift: CalendarShift) => {
    if (!confirm("このシフトを削除してもよろしいですか？")) {
      return;
    }

    try {
      // シフトが確定済みの場合は確定シフトを削除
      if (shift.isConfirmed) {
        await attendanceService.deleteConfirmedShift(shift.id);
      } else {
        // リクエストの場合はリクエストを削除
        await attendanceService.deleteShiftRequest(shift.id);
      }

      setIsShiftDetailModalOpen(false);
      setSelectedShift(null);
      handleShiftModalSuccess();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to delete shift:", error);
      }
      alert("シフトの削除に失敗しました");
    }
  };

  const getShiftTypeColor = (shiftType: string) => {
    switch (shiftType) {
      case "regular":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "overtime":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "holiday":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getDayOfWeekLabel = (dayIndex: number) => {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return days[dayIndex];
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-7 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="space-y-2">
                  {[...Array(3)].map((_, j) => (
                    <div
                      key={j}
                      className="h-16 bg-gray-200 dark:bg-gray-700 rounded"
                    ></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              週間スケジュール
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateWeek("prev")}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 px-3">
                {format(new Date(currentWeekStart), "yyyy年M月d日", {
                  locale: ja,
                })}{" "}
                -{" "}
                {format(
                  new Date(weeklyData?.weekEnd || currentWeekStart),
                  "M月d日",
                  { locale: ja }
                )}
              </span>
              <button
                onClick={() => navigateWeek("next")}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={goToToday}
              className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <CalendarDaysIcon className="w-4 h-4 mr-2" />
              今日
            </button>
            <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              <PlusIcon className="w-4 h-4 mr-2" />
              シフト追加
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        <div className="grid grid-cols-7 gap-4">
          {weeklyData?.days.map((day, dayIndex) => (
            <div key={day.date} className="min-h-48">
              {/* Day Header */}
              <div className="text-center mb-3">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {getDayOfWeekLabel(dayIndex)}
                </div>
                <div
                  className={`text-lg font-semibold ${
                    day.date === format(new Date(), "yyyy-MM-dd")
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {format(new Date(day.date), "d")}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {day.totalStaff}人予定
                </div>
              </div>

              {/* Shifts */}
              <div className="space-y-2">
                {day.shifts.map((shift: CalendarShift) => (
                  <div
                    key={shift.id}
                    className={`p-2 rounded-md text-xs cursor-pointer hover:shadow-sm transition-shadow ${getShiftTypeColor(shift.shiftType)}`}
                    onClick={() => handleShiftClick(shift)}
                  >
                    <div className="font-medium truncate">
                      {shift.staffName}
                    </div>
                    <div className="text-xs">
                      {shift.startTime} - {shift.endTime}
                    </div>
                  </div>
                ))}

                {day.shifts.length === 0 && (
                  <div className="text-center py-4 text-gray-400 dark:text-gray-500">
                    <div className="text-xs">シフトなし</div>
                  </div>
                )}

                {/* Add Shift Button */}
                <button
                  onClick={() => handleAddShiftClick(day.date)}
                  className="w-full p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-400 dark:text-gray-500 hover:border-indigo-300 hover:text-indigo-500 dark:hover:border-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div className="text-gray-600 dark:text-gray-300">
              総シフト数:{" "}
              {weeklyData?.days.reduce(
                (total, day) => total + day.totalStaff,
                0
              ) || 0}
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              確定済み:{" "}
              {weeklyData?.days.reduce(
                (total, day) => total + day.confirmedStaff,
                0
              ) || 0}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-200 rounded"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                通常勤務
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-200 rounded"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                残業
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-200 rounded"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                休日出勤
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedShift && (
        <ShiftDetailModal
          isOpen={isShiftDetailModalOpen}
          onClose={() => {
            setIsShiftDetailModalOpen(false);
            setSelectedShift(null);
          }}
          shift={selectedShift}
          onEdit={handleEditShift}
          onDelete={handleDeleteShift}
        />
      )}

      <AddShiftModal
        isOpen={isAddShiftModalOpen}
        onClose={() => {
          setIsAddShiftModalOpen(false);
          setSelectedDateForAdd("");
        }}
        selectedDate={selectedDateForAdd}
        onSuccess={handleShiftModalSuccess}
      />

      {/* Edit Modal - using AddShiftModal with shift data for editing */}
      {selectedShift && (
        <AddShiftModal
          isOpen={isEditShiftModalOpen}
          onClose={() => {
            setIsEditShiftModalOpen(false);
            setSelectedShift(null);
          }}
          selectedDate={selectedShift.date}
          onSuccess={() => {
            setIsEditShiftModalOpen(false);
            setSelectedShift(null);
            handleShiftModalSuccess();
          }}
        />
      )}
    </div>
  );
}
