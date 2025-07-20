import type { Database } from "./database.types";

// データベース型のエイリアス
export type InventoryMovement =
  Database["public"]["Tables"]["inventory_movements"]["Row"];
export type CreateInventoryMovementData =
  Database["public"]["Tables"]["inventory_movements"]["Insert"];
export type UpdateInventoryMovementData =
  Database["public"]["Tables"]["inventory_movements"]["Update"];

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type CreateProductData =
  Database["public"]["Tables"]["products"]["Insert"];
export type UpdateProductData =
  Database["public"]["Tables"]["products"]["Update"];

// 在庫変動タイプ
export type InventoryMovementType = "in" | "out" | "adjustment";

// 在庫統計
export interface InventoryStats {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
}

// 在庫レポート
export interface InventoryReport {
  product: Product;
  currentStock: number;
  movements: InventoryMovement[];
  lastMovement?: InventoryMovement;
  isLowStock: boolean;
  isOutOfStock: boolean;
  estimatedValue: number;
}

// 在庫アラート
export interface InventoryAlert {
  id: string;
  productId: number;
  productName: string;
  currentStock: number;
  threshold: number;
  alertType: "low_stock" | "out_of_stock" | "overstock";
  severity: "warning" | "critical";
  createdAt: string;
}

// 在庫変動作成データ（拡張版）
export interface CreateInventoryMovementRequest {
  productId: number;
  movementType: InventoryMovementType;
  quantity: number;
  unitCost?: number;
  reason?: string;
  referenceId?: string;
}

// 在庫調整データ
export interface InventoryAdjustmentData {
  productId: number;
  currentStock: number;
  adjustedStock: number;
  reason: string;
}

// 在庫検索フィルター
export interface InventorySearchFilter {
  category?: string;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
  searchTerm?: string;
  sortBy?: "name" | "stock" | "lastUpdated";
  sortOrder?: "asc" | "desc";
}

// 期間別在庫レポート
export interface PeriodInventoryReport {
  startDate: string;
  endDate: string;
  totalMovements: number;
  incomingStock: number;
  outgoingStock: number;
  adjustments: number;
  topMovedProducts: Array<{
    product: Product;
    totalQuantity: number;
    movementCount: number;
  }>;
}

// 発注提案
export interface ReorderSuggestion {
  product: Product;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  estimatedCost: number;
  priority: "high" | "medium" | "low";
  daysUntilStockout?: number;
}
