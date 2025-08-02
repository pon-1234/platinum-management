import { create } from "zustand";
import type {
  ShiftRequest,
  CreateShiftRequestInput,
} from "@/types/attendance.types";
import {
  searchShiftRequestsAction,
  createShiftRequestAction,
  approveShiftRequestAction,
  rejectShiftRequestAction,
} from "@/app/actions/attendance.actions";

interface ShiftRequestState {
  shiftRequests: ShiftRequest[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchShiftRequests: (params?: {
    status?: "pending" | "approved" | "rejected";
    staffId?: string;
    limit?: number;
  }) => Promise<void>;
  createShiftRequest: (data: CreateShiftRequestInput) => Promise<void>;
  approveShiftRequest: (requestId: string) => Promise<void>;
  rejectShiftRequest: (requestId: string, reason: string) => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useShiftRequestStore = create<ShiftRequestState>((set, get) => ({
  shiftRequests: [],
  isLoading: false,
  error: null,

  fetchShiftRequests: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const result = await searchShiftRequestsAction(params);
      if (result.success) {
        set({ shiftRequests: result.data });
      } else {
        set({ error: result.error });
      }
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "シフト申請の取得に失敗しました",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  createShiftRequest: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await createShiftRequestAction(data);
      if (result.success) {
        // 作成成功後、リストを再取得
        await get().fetchShiftRequests();
      } else {
        set({ error: result.error });
      }
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "シフト申請の作成に失敗しました",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  approveShiftRequest: async (requestId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await approveShiftRequestAction(requestId);
      if (result.success) {
        // 承認成功後、リストを再取得
        await get().fetchShiftRequests();
      } else {
        set({ error: result.error });
      }
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "シフト申請の承認に失敗しました",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  rejectShiftRequest: async (requestId, reason) => {
    set({ isLoading: true, error: null });
    try {
      const result = await rejectShiftRequestAction(requestId, reason);
      if (result.success) {
        // 却下成功後、リストを再取得
        await get().fetchShiftRequests();
      } else {
        set({ error: result.error });
      }
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "シフト申請の却下に失敗しました",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
