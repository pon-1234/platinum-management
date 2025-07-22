import { useCallback, useEffect, useMemo } from "react";
import { useCastPerformanceStore } from "@/stores/cast-performance.store";
import { useCastStore } from "@/stores/cast.store";
import { format, startOfMonth, endOfMonth } from "date-fns";
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
    clearPerformances,
    clearRankings,
    clearCompensations,
    clearAll,
  } = useCastPerformanceStore();

  const { getCastById } = useCastStore();

  // Automatically fetch performances when castId changes
  useEffect(() => {
    if (castId) {
      fetchPerformances({ castId });
    }
  }, [castId, refreshKey]);

  // Get cast info and current month performances
  const currentMonthPerformances = useMemo(() => {
    if (!castId) return [];

    const now = new Date();
    const startDate = format(startOfMonth(now), "yyyy-MM-dd");
    const endDate = format(endOfMonth(now), "yyyy-MM-dd");

    return performances.filter(
      (perf) =>
        perf.castId === castId && perf.date >= startDate && perf.date <= endDate
    );
  }, [performances, castId]);

  // Calculate performance totals with memoization
  const performanceTotals = useMemo(() => {
    return currentMonthPerformances.reduce(
      (acc, perf) => ({
        shimeiCount: acc.shimeiCount + perf.shimeiCount,
        dohanCount: acc.dohanCount + perf.dohanCount,
        salesAmount: acc.salesAmount + perf.salesAmount,
        drinkCount: acc.drinkCount + perf.drinkCount,
      }),
      { shimeiCount: 0, dohanCount: 0, salesAmount: 0, drinkCount: 0 }
    );
  }, [currentMonthPerformances]);

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
    currentMonthPerformances,
    performanceTotals,
    selectedPerformance,
    isLoading: performanceLoading,
    rankings,
    rankingLoading,
    compensations,
    compensationLoading,
    showForm,
    error,

    // Actions
    getCastById,
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

    // Cleanup Actions
    clearPerformances,
    clearRankings,
    clearCompensations,
    clearAll,
  };
};
