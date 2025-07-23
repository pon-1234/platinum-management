import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { attendanceService } from "@/services/attendance.service";
import type {
  AttendanceDashboard,
  WeeklySchedule,
  ShiftRequest,
  AttendanceRecord,
} from "@/types/attendance.types";

interface AttendanceState {
  // Dashboard state
  dashboardData: AttendanceDashboard | null;
  dashboardLoading: boolean;

  // Schedule state
  weeklySchedule: WeeklySchedule | null;
  scheduleLoading: boolean;

  // Shift requests state
  shiftRequests: ShiftRequest[];
  requestsLoading: boolean;

  // Current attendance state
  todayRecord: AttendanceRecord | null;
  recordLoading: boolean;

  // Common state
  error: string | null;

  // Actions
  fetchDashboard: () => Promise<void>;
  fetchWeeklySchedule: (weekStart: string) => Promise<void>;
  fetchShiftRequests: (params?: {
    status?: string;
    staffId?: string;
    limit?: number;
  }) => Promise<void>;

  // Clock actions
  clockIn: (notes?: string) => Promise<void>;
  clockOut: (notes?: string) => Promise<void>;
  startBreak: (notes?: string) => Promise<void>;
  endBreak: (notes?: string) => Promise<void>;

  // Shift request actions
  createShiftRequest: (data: {
    requestDate: string;
    shiftType: string;
    startTime: string;
    endTime: string;
    reason?: string;
  }) => Promise<void>;

  approveShiftRequest: (requestId: string) => Promise<void>;
  rejectShiftRequest: (requestId: string, reason: string) => Promise<void>;

  // Utility actions
  setError: (error: string | null) => void;
  clearError: () => void;
  refreshDashboard: () => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      dashboardData: null,
      dashboardLoading: false,
      weeklySchedule: null,
      scheduleLoading: false,
      shiftRequests: [],
      requestsLoading: false,
      todayRecord: null,
      recordLoading: false,
      error: null,

      // Actions
      fetchDashboard: async () => {
        set({ dashboardLoading: true, error: null });
        try {
          const dashboardData =
            await attendanceService.getAttendanceDashboard();
          set({ dashboardData, dashboardLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "ダッシュボード取得に失敗しました";
          set({ error: errorMessage, dashboardLoading: false });
        }
      },

      fetchWeeklySchedule: async (weekStart: string) => {
        set({ scheduleLoading: true, error: null });
        try {
          const weeklySchedule =
            await attendanceService.getWeeklySchedule(weekStart);
          set({ weeklySchedule, scheduleLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "週間スケジュール取得に失敗しました";
          set({ error: errorMessage, scheduleLoading: false });
        }
      },

      fetchShiftRequests: async (params = {}) => {
        set({ requestsLoading: true, error: null });
        try {
          const shiftRequests = await attendanceService.searchShiftRequests({
            ...params,
            status: params.status as
              | "pending"
              | "approved"
              | "rejected"
              | undefined,
          });
          set({ shiftRequests, requestsLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "シフト申請取得に失敗しました";
          set({ error: errorMessage, requestsLoading: false });
        }
      },

      clockIn: async (notes) => {
        set({ recordLoading: true, error: null });
        try {
          // Get current staff ID through the service
          const staffId = await attendanceService["getCurrentStaffId"]();
          if (!staffId) throw new Error("スタッフIDが見つかりません");

          await attendanceService.clockAction(staffId, {
            type: "clock_in",
            timestamp: new Date().toISOString(),
            notes,
          });
          // Refresh dashboard after clock action
          const { fetchDashboard } = get();
          await fetchDashboard();
          set({ recordLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "出勤打刻に失敗しました";
          set({ error: errorMessage, recordLoading: false });
        }
      },

      clockOut: async (notes) => {
        set({ recordLoading: true, error: null });
        try {
          // Get current staff ID through the service
          const staffId = await attendanceService["getCurrentStaffId"]();
          if (!staffId) throw new Error("スタッフIDが見つかりません");

          await attendanceService.clockAction(staffId, {
            type: "clock_out",
            timestamp: new Date().toISOString(),
            notes,
          });
          const { fetchDashboard } = get();
          await fetchDashboard();
          set({ recordLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "退勤打刻に失敗しました";
          set({ error: errorMessage, recordLoading: false });
        }
      },

      startBreak: async (notes) => {
        set({ recordLoading: true, error: null });
        try {
          // Get current staff ID through the service
          const staffId = await attendanceService["getCurrentStaffId"]();
          if (!staffId) throw new Error("スタッフIDが見つかりません");

          await attendanceService.clockAction(staffId, {
            type: "break_start",
            timestamp: new Date().toISOString(),
            notes,
          });
          const { fetchDashboard } = get();
          await fetchDashboard();
          set({ recordLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "休憩開始に失敗しました";
          set({ error: errorMessage, recordLoading: false });
        }
      },

      endBreak: async (notes) => {
        set({ recordLoading: true, error: null });
        try {
          // Get current staff ID through the service
          const staffId = await attendanceService["getCurrentStaffId"]();
          if (!staffId) throw new Error("スタッフIDが見つかりません");

          await attendanceService.clockAction(staffId, {
            type: "break_end",
            timestamp: new Date().toISOString(),
            notes,
          });
          const { fetchDashboard } = get();
          await fetchDashboard();
          set({ recordLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "休憩終了に失敗しました";
          set({ error: errorMessage, recordLoading: false });
        }
      },

      createShiftRequest: async (data) => {
        set({ requestsLoading: true, error: null });
        try {
          // Get current staff ID through the service
          const staffId = await attendanceService["getCurrentStaffId"]();
          if (!staffId) throw new Error("スタッフIDが見つかりません");

          await attendanceService.createShiftRequest({
            requestedDate: data.requestDate,
            startTime: data.startTime,
            endTime: data.endTime,
            notes: data.reason,
          });
          // Refresh shift requests after creation
          const { fetchShiftRequests } = get();
          await fetchShiftRequests();
          set({ requestsLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "シフト申請作成に失敗しました";
          set({ error: errorMessage, requestsLoading: false });
        }
      },

      approveShiftRequest: async (requestId: string) => {
        set({ requestsLoading: true, error: null });
        try {
          await attendanceService.approveShiftRequest(requestId, {
            approved: true,
          });
          // Refresh shift requests after approval
          const { fetchShiftRequests } = get();
          await fetchShiftRequests();
          set({ requestsLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "シフト申請承認に失敗しました";
          set({ error: errorMessage, requestsLoading: false });
        }
      },

      rejectShiftRequest: async (requestId: string, reason: string) => {
        set({ requestsLoading: true, error: null });
        try {
          await attendanceService.approveShiftRequest(requestId, {
            approved: false,
            rejectionReason: reason,
          });
          // Refresh shift requests after rejection
          const { fetchShiftRequests } = get();
          await fetchShiftRequests();
          set({ requestsLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "シフト申請却下に失敗しました";
          set({ error: errorMessage, requestsLoading: false });
        }
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      refreshDashboard: async () => {
        const { fetchDashboard } = get();
        await fetchDashboard();
      },
    }),
    {
      name: "attendance-store",
    }
  )
);
