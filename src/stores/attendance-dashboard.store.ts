import { create } from "zustand";
import type { AttendanceDashboard } from "@/types/attendance.types";
import { getAttendanceDashboardAction } from "@/app/actions/attendance.actions";

interface AttendanceDashboardState {
  dashboardData: AttendanceDashboard | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchDashboard: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
  refreshDashboard: () => Promise<void>;
}

export const useAttendanceDashboardStore = create<AttendanceDashboardState>(
  (set, get) => ({
    dashboardData: null,
    isLoading: false,
    error: null,

    fetchDashboard: async () => {
      set({ isLoading: true, error: null });
      try {
        const result = await getAttendanceDashboardAction();
        if (result.success) {
          set({ dashboardData: result.data });
        } else {
          set({ error: result.error });
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "ダッシュボードデータの取得に失敗しました",
        });
      } finally {
        set({ isLoading: false });
      }
    },

    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
    refreshDashboard: () => get().fetchDashboard(),
  })
);
