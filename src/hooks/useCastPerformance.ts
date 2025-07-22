import { useCallback, useEffect } from "react";
import { useCastPerformanceStore } from "@/stores/cast-performance.store";
import type {
  CreateCastPerformanceData,
  UpdateCastPerformanceData,
  CastPerformanceSearchParams,
} from "@/types/cast.types";

/**
 * @design_doc See doc.md - Cast Performance Data Access Hook
 * @related_to CastPerformanceStore, CastPerformanceService - abstraction layer for components
 * @known_issues None currently known
 */
export const useCastPerformance = (castId?: string) => {
  const {
    performances,
    selectedPerformance,
    performanceLoading,
    rankings,
    rankingLoading,
    compensations,
    compensationLoading,
    showForm,
    refreshKey,
    error,
    fetchPerformances,
    createPerformance,
    updatePerformance,
    selectPerformance,
    fetchRankings,
    calculateCompensation,
    calculateMultipleCompensations,
    toggleForm,
    setShowForm,
    refreshData,
    setError,
    clearError,
  } = useCastPerformanceStore();

  // Automatically fetch performances when castId changes
  useEffect(() => {
    if (castId) {
      fetchPerformances({ castId });
    }
  }, [castId, refreshKey, fetchPerformances]);

  // Memoized handlers to avoid unnecessary re-renders
  const handleCreatePerformance = useCallback(
    async (data: CreateCastPerformanceData) => {
      await createPerformance(data);
      setShowForm(false);
    },
    [createPerformance, setShowForm]
  );

  const handleUpdatePerformance = useCallback(
    async (id: string, data: UpdateCastPerformanceData) => {
      await updatePerformance(id, data);
    },
    [updatePerformance]
  );

  const handleFetchPerformances = useCallback(
    async (params?: CastPerformanceSearchParams) => {
      await fetchPerformances(params);
    },
    [fetchPerformances]
  );

  const handleFetchRankings = useCallback(
    async (startDate: string, endDate: string, limit?: number) => {
      await fetchRankings(startDate, endDate, limit);
    },
    [fetchRankings]
  );

  const handleCalculateCompensation = useCallback(
    async (targetCastId: string, startDate: string, endDate: string) => {
      await calculateCompensation(targetCastId, startDate, endDate);
    },
    [calculateCompensation]
  );

  const handleCalculateMultipleCompensations = useCallback(
    async (castIds: string[], startDate: string, endDate: string) => {
      await calculateMultipleCompensations(castIds, startDate, endDate);
    },
    [calculateMultipleCompensations]
  );

  return {
    // State
    performances,
    selectedPerformance,
    isLoading: performanceLoading,
    rankings,
    rankingLoading,
    compensations,
    compensationLoading,
    showForm,
    error,

    // Actions
    createPerformance: handleCreatePerformance,
    updatePerformance: handleUpdatePerformance,
    selectPerformance,
    fetchPerformances: handleFetchPerformances,
    fetchRankings: handleFetchRankings,
    calculateCompensation: handleCalculateCompensation,
    calculateMultipleCompensations: handleCalculateMultipleCompensations,

    // UI Actions
    toggleForm,
    setShowForm,
    refreshData,
    setError,
    clearError,
  };
};
