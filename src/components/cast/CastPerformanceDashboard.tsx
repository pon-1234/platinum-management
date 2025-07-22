"use client";

import { CastPerformanceMetrics } from "./CastPerformanceMetrics";
import { CastPerformanceHistory } from "./CastPerformanceHistory";
import { CastPerformanceForm } from "./CastPerformanceForm";
import { useCastPerformance } from "@/hooks/useCastPerformance";
import { PlusIcon } from "@heroicons/react/24/outline";

/**
 * @design_doc See doc.md - Cast Performance Dashboard Component
 * @related_to useCastPerformance, CastPerformanceStore - refactored to use custom hook
 * @known_issues None currently known
 */
interface CastPerformanceDashboardProps {
  castId: string;
  canEdit?: boolean;
}

export function CastPerformanceDashboard({
  castId,
  canEdit = false,
}: CastPerformanceDashboardProps) {
  const { showForm, setShowForm, refreshData } = useCastPerformance(castId);

  const handleFormSuccess = () => {
    setShowForm(false);
    refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            成績を記録
          </button>
        </div>
      )}

      {/* Performance Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              成績を記録
            </h3>
            <CastPerformanceForm
              castId={castId}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Current Month Metrics */}
      <CastPerformanceMetrics castId={castId} />

      {/* Performance History */}
      <CastPerformanceHistory castId={castId} months={3} />
    </div>
  );
}
