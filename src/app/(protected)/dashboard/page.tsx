import {
  getDashboardStats,
  getRecentActivities,
  getHourlySales,
  getKpiTrends,
  getDashboardAlerts,
} from "./actions";
import { DashboardClient } from "./_components/DashboardClient";
import { DashboardFilterProvider } from "./_components/DashboardFilterProvider";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const [statsResult, activitiesResult, salesResult, kpiTrends, alerts] =
    await Promise.all([
      getDashboardStats(),
      getRecentActivities(),
      getHourlySales(),
      getKpiTrends(),
      getDashboardAlerts(),
    ]);

  const error = [
    !statsResult.success && statsResult.error,
    !activitiesResult.success && activitiesResult.error,
    !salesResult.success && salesResult.error,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <DashboardFilterProvider>
      <DashboardClient
        initialStats={
          statsResult.success && statsResult.data ? statsResult.data : null
        }
        recentActivities={activitiesResult.success ? activitiesResult.data : []}
        hourlySales={salesResult.success ? salesResult.data : []}
        error={error || null}
        kpiTrends={kpiTrends.success ? (kpiTrends.data as any) : undefined}
        alerts={alerts.success ? (alerts.data as any) : undefined}
      />
    </DashboardFilterProvider>
  );
}
