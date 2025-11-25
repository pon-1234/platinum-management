import {
  getDashboardStats,
  getRecentActivities,
  getHourlySales,
  getKpiTrends,
  getDashboardAlerts,
} from "./actions";
import { DashboardClient } from "./_components/DashboardClient";
import { DashboardFilterProvider } from "./_components/DashboardFilterProvider";

type KpiTrends = {
  sales: { today: number; d1: number | null; dow: number | null };
  reservations: { today: number; d1: number | null; dow: number | null };
};

type DashboardAlerts = {
  lowStockCount: number;
  expiringBottles: number;
  pendingShifts: number;
};

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
        kpiTrends={
          (kpiTrends.success ? (kpiTrends.data as KpiTrends) : undefined) as
            | KpiTrends
            | undefined
        }
        alerts={
          (alerts.success ? (alerts.data as DashboardAlerts) : undefined) as
            | DashboardAlerts
            | undefined
        }
      />
    </DashboardFilterProvider>
  );
}
