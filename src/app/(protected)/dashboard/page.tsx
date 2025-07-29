import { getDashboardStats } from "./actions";
import { DashboardClient } from "./_components/DashboardClient";

export default async function DashboardPage() {
  const result = await getDashboardStats();

  return (
    <DashboardClient
      initialStats={result.success && result.data ? result.data : null}
      error={
        result.success
          ? null
          : result.error || "ダッシュボードデータの取得に失敗しました"
      }
    />
  );
}
