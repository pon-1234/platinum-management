"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ClockIcon,
  PlayIcon,
  StopIcon,
  PauseIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { AttendanceService } from "@/services/attendance.service";
import { StaffService } from "@/services/staff.service";
import type { ClockAction, AttendanceRecord } from "@/types/attendance.types";
import type { Staff } from "@/types/staff.types";

interface TimeClockProps {
  onClockAction: () => void;
}

export function TimeClock({ onClockAction }: TimeClockProps) {
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notes, setNotes] = useState("");

  const attendanceService = new AttendanceService();
  const staffService = new StaffService();

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load current staff and today's attendance record
  useEffect(() => {
    const loadStaffData = async () => {
      try {
        // Get current user's staff record
        const {
          data: { user },
        } = await attendanceService["supabase"].auth.getUser();
        if (!user) return;

        const staff = await staffService.getStaffByUserId(user.id);
        if (staff) {
          setCurrentStaff(staff);

          // Get today's attendance record
          const today = format(new Date(), "yyyy-MM-dd");
          const records = await attendanceService.searchAttendanceRecords({
            staffId: staff.id,
            startDate: today,
            endDate: today,
          });

          if (records.length > 0) {
            setTodayRecord(records[0]);
          }
        }
      } catch (error) {
        console.error("スタッフデータの読み込みに失敗しました:", error);
      }
    };

    loadStaffData();
  }, []);

  const handleClockAction = useCallback(
    async (actionType: ClockAction["type"]) => {
      if (!currentStaff) {
        alert("スタッフ情報が見つかりません");
        return;
      }

      try {
        setIsLoading(true);

        const action: ClockAction = {
          type: actionType,
          timestamp: new Date().toISOString(),
          notes: notes || undefined,
        };

        const updatedRecord = await attendanceService.clockAction(
          currentStaff.id,
          action
        );
        setTodayRecord(updatedRecord);
        setNotes("");
        onClockAction();

        // Show success message
        const actionLabels = {
          clock_in: "出勤",
          clock_out: "退勤",
          break_start: "休憩開始",
          break_end: "休憩終了",
        };
        alert(`${actionLabels[actionType]}を記録しました`);
      } catch (error) {
        console.error("打刻処理に失敗しました:", error);
        alert("打刻処理に失敗しました。もう一度お試しください。");
      } finally {
        setIsLoading(false);
      }
    },
    [currentStaff, notes, onClockAction]
  );

  const getStatusText = () => {
    if (!todayRecord) return "未出勤";

    if (todayRecord.clockInTime && !todayRecord.clockOutTime) {
      if (todayRecord.breakStartTime && !todayRecord.breakEndTime) {
        return "休憩中";
      }
      return "勤務中";
    }

    if (todayRecord.clockOutTime) {
      return "退勤済み";
    }

    return "未出勤";
  };

  const getStatusColor = () => {
    const status = getStatusText();
    switch (status) {
      case "勤務中":
        return "text-green-600 dark:text-green-400";
      case "休憩中":
        return "text-yellow-600 dark:text-yellow-400";
      case "退勤済み":
        return "text-gray-600 dark:text-gray-400";
      default:
        return "text-gray-500 dark:text-gray-500";
    }
  };

  const canClockIn = !todayRecord?.clockInTime;
  const canClockOut = todayRecord?.clockInTime && !todayRecord?.clockOutTime;
  const canStartBreak =
    todayRecord?.clockInTime &&
    !todayRecord?.breakStartTime &&
    !todayRecord?.clockOutTime;
  const canEndBreak = todayRecord?.breakStartTime && !todayRecord?.breakEndTime;

  if (!currentStaff) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          スタッフ情報が見つかりません
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          ログインし直してください
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Current Time Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <ClockIcon className="w-16 h-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
        <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {format(currentTime, "HH:mm:ss")}
        </div>
        <div className="text-lg text-gray-600 dark:text-gray-400 mb-4">
          {format(currentTime, "yyyy年M月d日 (E)", {
            locale: (await import("date-fns/locale/ja")).default,
          })}
        </div>
        <div className={`text-lg font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Staff Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <UserIcon className="w-6 h-6 text-gray-400 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {currentStaff.fullName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentStaff.role}
            </p>
          </div>
        </div>

        {/* Today's Record Summary */}
        {todayRecord && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                出勤時刻:
              </span>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {todayRecord.clockInTime
                  ? format(new Date(todayRecord.clockInTime), "HH:mm")
                  : "-"}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                退勤時刻:
              </span>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {todayRecord.clockOutTime
                  ? format(new Date(todayRecord.clockOutTime), "HH:mm")
                  : "-"}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                休憩開始:
              </span>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {todayRecord.breakStartTime
                  ? format(new Date(todayRecord.breakStartTime), "HH:mm")
                  : "-"}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">
                休憩終了:
              </span>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {todayRecord.breakEndTime
                  ? format(new Date(todayRecord.breakEndTime), "HH:mm")
                  : "-"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          備考（任意）
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
          placeholder="打刻に関する備考があれば入力してください"
        />
      </div>

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleClockAction("clock_in")}
            disabled={!canClockIn || isLoading}
            className={`flex items-center justify-center px-6 py-4 rounded-lg font-medium transition-colors ${
              canClockIn && !isLoading
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            <PlayIcon className="w-5 h-5 mr-2" />
            出勤
          </button>

          <button
            onClick={() => handleClockAction("clock_out")}
            disabled={!canClockOut || isLoading}
            className={`flex items-center justify-center px-6 py-4 rounded-lg font-medium transition-colors ${
              canClockOut && !isLoading
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            <StopIcon className="w-5 h-5 mr-2" />
            退勤
          </button>

          <button
            onClick={() => handleClockAction("break_start")}
            disabled={!canStartBreak || isLoading}
            className={`flex items-center justify-center px-6 py-4 rounded-lg font-medium transition-colors ${
              canStartBreak && !isLoading
                ? "bg-yellow-600 text-white hover:bg-yellow-700"
                : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            <PauseIcon className="w-5 h-5 mr-2" />
            休憩開始
          </button>

          <button
            onClick={() => handleClockAction("break_end")}
            disabled={!canEndBreak || isLoading}
            className={`flex items-center justify-center px-6 py-4 rounded-lg font-medium transition-colors ${
              canEndBreak && !isLoading
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            <PlayIcon className="w-5 h-5 mr-2" />
            休憩終了
          </button>
        </div>
      </div>
    </div>
  );
}
