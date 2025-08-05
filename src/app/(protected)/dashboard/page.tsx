import {
  getDashboardStats,
  getRecentActivities,
  getHourlySales,
} from "./actions";
import { DashboardClient } from "./_components/DashboardClient";

export default async function DashboardPage() {
  const [statsResult, activitiesResult, salesResult] = await Promise.all([
    getDashboardStats(),
    getRecentActivities(),
    getHourlySales(),
  ]);

  const error = [
    !statsResult.success && statsResult.error,
    !activitiesResult.success && activitiesResult.error,
    !salesResult.success && salesResult.error,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <DashboardClient
      initialStats={
        statsResult.success && statsResult.data ? statsResult.data : null
      }
      recentActivities={activitiesResult.success ? activitiesResult.data : []}
      hourlySales={salesResult.success ? salesResult.data : []}
      error={error || null}
    />
  );
}
