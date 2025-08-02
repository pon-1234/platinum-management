import { create } from "zustand";
import type { AttendanceRecord } from "@/types/attendance.types";
import {
  clockInAction,
  clockOutAction,
  startBreakAction,
  endBreakAction,
  getTodayAttendanceAction,
} from "@/app/actions/attendance.actions";

interface AttendanceTimeClockState {
  todayRecord: AttendanceRecord | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTodayRecord: () => Promise<void>;
  clockIn: (notes?: string) => Promise<void>;
  clockOut: (notes?: string) => Promise<void>;
  startBreak: (notes?: string) => Promise<void>;
  endBreak: (notes?: string) => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAttendanceTimeClockStore = create<AttendanceTimeClockState>(
  (set, get) => ({
    todayRecord: null,
    isLoading: false,
    error: null,

    fetchTodayRecord: async () => {
      set({ isLoading: true, error: null });
      try {
        const result = await getTodayAttendanceAction();
        if (result.success) {
          set({ todayRecord: result.data });
        } else {
          set({ error: result.error });
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "本日の勤怠記録の取得に失敗しました",
        });
      } finally {
        set({ isLoading: false });
      }
    },

    clockIn: async (notes) => {
      set({ isLoading: true, error: null });
      try {
        const result = await clockInAction(notes);
        if (result.success) {
          // 打刻成功後、本日の記録を再取得
          await get().fetchTodayRecord();
        } else {
          set({ error: result.error });
        }
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "出勤打刻に失敗しました",
        });
      } finally {
        set({ isLoading: false });
      }
    },

    clockOut: async (notes) => {
      set({ isLoading: true, error: null });
      try {
        const result = await clockOutAction(notes);
        if (result.success) {
          // 打刻成功後、本日の記録を再取得
          await get().fetchTodayRecord();
        } else {
          set({ error: result.error });
        }
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "退勤打刻に失敗しました",
        });
      } finally {
        set({ isLoading: false });
      }
    },

    startBreak: async (notes) => {
      set({ isLoading: true, error: null });
      try {
        const result = await startBreakAction(notes);
        if (result.success) {
          // 打刻成功後、本日の記録を再取得
          await get().fetchTodayRecord();
        } else {
          set({ error: result.error });
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "休憩開始打刻に失敗しました",
        });
      } finally {
        set({ isLoading: false });
      }
    },

    endBreak: async (notes) => {
      set({ isLoading: true, error: null });
      try {
        const result = await endBreakAction(notes);
        if (result.success) {
          // 打刻成功後、本日の記録を再取得
          await get().fetchTodayRecord();
        } else {
          set({ error: result.error });
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "休憩終了打刻に失敗しました",
        });
      } finally {
        set({ isLoading: false });
      }
    },

    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
  })
);
