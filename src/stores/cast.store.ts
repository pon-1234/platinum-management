import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { castService } from "@/services/cast.service";
import type { Cast } from "@/types/cast.types";

/**
 * @design_doc See doc.md - Cast Profile State Management
 * @related_to CastService - state management layer for cast profiles only
 * @known_issues Performance data moved to separate store
 */
interface CastState {
  // State
  casts: Cast[];
  selectedCast: Cast | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCasts: (params?: { isActive?: boolean }) => Promise<void>;
  getCastById: (id: string) => Promise<Cast | null>;
  selectCast: (cast: Cast | null) => void;
  refreshCasts: () => Promise<void>;

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
