import { getInventoryPageData } from "@/app/actions/inventory.actions";
import { InventoryClient } from "./_components/InventoryClient";

export default async function InventoryPage() {
  // 初期表示時は最小限のデータのみ取得（最初の20件）
  const result = await getInventoryPageData({ limit: 20 });

  if (result.success) {
    return <InventoryClient initialData={result.data} error={null} />;
  } else {
    return (
      <InventoryClient
        initialData={{
          products: [],
          stats: null,
          alerts: [],
          categories: [],
        }}
        error={result.error || "在庫データの取得に失敗しました"}
      />
    );
  }
}
