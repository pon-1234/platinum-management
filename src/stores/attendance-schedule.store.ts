import { create } from "zustand";
import type { WeeklySchedule } from "@/types/attendance.types";
import { getWeeklyScheduleAction } from "@/app/actions/attendance.actions";

interface AttendanceScheduleState {
  weeklySchedule: WeeklySchedule | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchWeeklySchedule: (weekStart: string) => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAttendanceScheduleStore = create<AttendanceScheduleState>(
  (set) => ({
    weeklySchedule: null,
    isLoading: false,
    error: null,

    fetchWeeklySchedule: async (weekStart: string) => {
      set({ isLoading: true, error: null });
      try {
        const result = await getWeeklyScheduleAction(weekStart);
        if (result.success) {
          set({ weeklySchedule: result.data });
        } else {
          set({ error: result.error });
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "週間スケジュールの取得に失敗しました",
        });
      } finally {
        set({ isLoading: false });
      }
    },

    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
  })
);
