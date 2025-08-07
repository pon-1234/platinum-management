import { Suspense } from "react";
import { CustomerAnalyticsDashboard } from "@/components/analytics/CustomerAnalyticsDashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerAnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">顧客分析レポート</h1>
        <p className="mt-2 text-gray-600">
          顧客のリピート率、離反リスク、生涯価値などを分析し、効果的な顧客維持戦略を立案します。
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        }
      >
        <CustomerAnalyticsDashboard />
      </Suspense>
    </div>
  );
}
