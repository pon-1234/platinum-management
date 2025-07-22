import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { castService } from "@/services/cast.service";
import type { Cast, CastPerformance } from "@/types/cast.types";

interface CastState {
  // State
  casts: Cast[];
  selectedCast: Cast | null;
  isLoading: boolean;
  error: string | null;

  // Performance data
  performances: CastPerformance[];
  performanceLoading: boolean;

  // Actions
  fetchCasts: (params?: { isActive?: boolean }) => Promise<void>;
  getCastById: (id: string) => Promise<Cast | null>;
  selectCast: (cast: Cast | null) => void;
  refreshCasts: () => Promise<void>;

  // Performance actions
  fetchPerformances: (params: {
    castId?: string;
    startDate?: Date;
    endDate?: Date;
  }) => Promise<void>;

  // Utility actions
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useCastStore = create<CastState>()(
  devtools(
    (set, get) => ({
      // Initial state
      casts: [],
      selectedCast: null,
      isLoading: false,
      error: null,
      performances: [],
      performanceLoading: false,

      // Actions
      fetchCasts: async (params = {}) => {
        set({ isLoading: true, error: null });
        try {
          const casts = await castService.getCasts(params);
          set({ casts, isLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "キャスト取得に失敗しました";
          set({ error: errorMessage, isLoading: false });
        }
      },

      getCastById: async (id: string) => {
        try {
          const cast = await castService.getCastById(id);
          return cast;
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "キャスト取得に失敗しました";
          set({ error: errorMessage });
          return null;
        }
      },

      selectCast: (cast) => {
        set({ selectedCast: cast });
      },

      refreshCasts: async () => {
        const { fetchCasts } = get();
        await fetchCasts({ isActive: true });
      },

      fetchPerformances: async (params) => {
        set({ performanceLoading: true, error: null });
        try {
          const performances = await castService.getCastPerformances({
            castId: params.castId,
            startDate: params.startDate?.toISOString().split("T")[0],
            endDate: params.endDate?.toISOString().split("T")[0],
          });
          set({ performances, performanceLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "成績取得に失敗しました";
          set({ error: errorMessage, performanceLoading: false });
        }
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "cast-store",
    }
  )
);
