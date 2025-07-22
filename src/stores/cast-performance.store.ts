import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { castPerformanceService } from "@/services/cast-performance.service";
import { castCompensationService } from "@/services/cast-compensation.service";
import type {
  CastPerformance,
  CastRanking,
  CastCompensation,
  CreateCastPerformanceData,
  UpdateCastPerformanceData,
  CastPerformanceSearchParams,
} from "@/types/cast.types";

/**
 * @design_doc See doc.md - Cast Performance State Management
 * @related_to CastPerformanceService, CastCompensationService - state management layer
 * @known_issues None currently known
 */
interface CastPerformanceState {
  // Performance data
  performances: CastPerformance[];
  selectedPerformance: CastPerformance | null;
  performanceLoading: boolean;

  // Rankings
  rankings: CastRanking[];
  rankingLoading: boolean;

  // Compensation
  compensations: CastCompensation[];
  compensationLoading: boolean;

  // UI state
  showForm: boolean;
  refreshKey: number;
  error: string | null;

  // Performance actions
  fetchPerformances: (params?: CastPerformanceSearchParams) => Promise<void>;
  createPerformance: (data: CreateCastPerformanceData) => Promise<void>;
  updatePerformance: (
    id: string,
    data: UpdateCastPerformanceData
  ) => Promise<void>;
  selectPerformance: (performance: CastPerformance | null) => void;

  // Ranking actions
  fetchRankings: (
    startDate: string,
    endDate: string,
    limit?: number
  ) => Promise<void>;

  // Compensation actions
  calculateCompensation: (
    castId: string,
    startDate: string,
    endDate: string
  ) => Promise<void>;
  calculateMultipleCompensations: (
    castIds: string[],
    startDate: string,
    endDate: string
  ) => Promise<void>;

  // UI actions
  toggleForm: () => void;
  setShowForm: (show: boolean) => void;
  refreshData: () => void;

  // Utility actions
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useCastPerformanceStore = create<CastPerformanceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      performances: [],
      selectedPerformance: null,
      performanceLoading: false,
      rankings: [],
      rankingLoading: false,
      compensations: [],
      compensationLoading: false,
      showForm: false,
      refreshKey: 0,
      error: null,

      // Performance actions
      fetchPerformances: async (params = {}) => {
        set({ performanceLoading: true, error: null });
        try {
          const performances =
            await castPerformanceService.getCastPerformances(params);
          set({ performances, performanceLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "成績取得に失敗しました";
          set({ error: errorMessage, performanceLoading: false });
        }
      },

      createPerformance: async (data) => {
        try {
          await castPerformanceService.createCastPerformance(data);
          // Refresh data after creation
          const { fetchPerformances, refreshData } = get();
          await fetchPerformances({ castId: data.castId });
          refreshData();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "成績の記録に失敗しました";
          set({ error: errorMessage });
        }
      },

      updatePerformance: async (id, data) => {
        try {
          const updatedPerformance =
            await castPerformanceService.updateCastPerformance(id, data);
          const { performances } = get();
          const updatedPerformances = performances.map((p) =>
            p.id === id ? updatedPerformance : p
          );
          set({ performances: updatedPerformances });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "成績の更新に失敗しました";
          set({ error: errorMessage });
        }
      },

      selectPerformance: (performance) => {
        set({ selectedPerformance: performance });
      },

      // Ranking actions
      fetchRankings: async (startDate, endDate, limit = 10) => {
        set({ rankingLoading: true, error: null });
        try {
          const rankings = await castPerformanceService.getCastRanking(
            startDate,
            endDate,
            limit
          );
          set({ rankings, rankingLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "ランキング取得に失敗しました";
          set({ error: errorMessage, rankingLoading: false });
        }
      },

      // Compensation actions
      calculateCompensation: async (castId, startDate, endDate) => {
        set({ compensationLoading: true, error: null });
        try {
          const compensation =
            await castCompensationService.calculateCastCompensation(
              castId,
              startDate,
              endDate
            );
          set({
            compensations: [compensation],
            compensationLoading: false,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "給与計算に失敗しました";
          set({ error: errorMessage, compensationLoading: false });
        }
      },

      calculateMultipleCompensations: async (castIds, startDate, endDate) => {
        set({ compensationLoading: true, error: null });
        try {
          const compensations =
            await castCompensationService.calculateMultipleCastsCompensation(
              castIds,
              startDate,
              endDate
            );
          set({ compensations, compensationLoading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "給与計算に失敗しました";
          set({ error: errorMessage, compensationLoading: false });
        }
      },

      // UI actions
      toggleForm: () => {
        const { showForm } = get();
        set({ showForm: !showForm });
      },

      setShowForm: (show) => {
        set({ showForm: show });
      },

      refreshData: () => {
        const { refreshKey } = get();
        set({ refreshKey: refreshKey + 1 });
      },

      // Utility actions
      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "cast-performance-store",
    }
  )
);
