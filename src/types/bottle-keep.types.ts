import type { Database } from "./database.types";

// データベース型のエイリアス
export type BottleKeep = Database["public"]["Tables"]["bottle_keeps"]["Row"];
export type CreateBottleKeepData =
  Database["public"]["Tables"]["bottle_keeps"]["Insert"];
export type UpdateBottleKeepData =
  Database["public"]["Tables"]["bottle_keeps"]["Update"];

export type BottleKeepUsage =
  Database["public"]["Tables"]["bottle_keep_usage"]["Row"];
export type CreateBottleKeepUsageData =
  Database["public"]["Tables"]["bottle_keep_usage"]["Insert"];

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];

// ボトルキープの状態
export type BottleKeepStatus = "active" | "consumed" | "expired";

// ボトルキープ作成リクエスト
export interface CreateBottleKeepRequest {
  customerId: string;
  productId: number;
  openedDate: string;
  expiryDate?: string;
  bottleNumber?: string;
  storageLocation?: string;
  notes?: string;
}

// ボトルキープ使用リクエスト
export interface UseBottleKeepRequest {
  bottleKeepId: string;
  visitId: string;
  amountUsed: number;
  notes?: string;
}

// ボトルキープ詳細情報（結合データ）
export interface BottleKeepDetail extends BottleKeep {
  customer?: Customer;
  product?: Product;
  usage_history?: BottleKeepUsage[];
  total_used?: number;
}

// ボトルキープ統計
export interface BottleKeepStats {
  totalBottles: number;
  activeBottles: number;
  expiredBottles: number;
  consumedBottles: number;
  totalValue: number;
  expiringTown: number; // 一週間以内に期限切れ
}

// ボトルキープアラート
export interface BottleKeepAlert {
  id: string;
  bottleKeepId: string;
  customerName: string;
  productName: string;
  alertType: "expiring" | "expired" | "low_amount";
  severity: "warning" | "critical";
  message: string;
  expiryDate?: string;
  remainingAmount?: number;
  daysUntilExpiry?: number;
}

// ボトルキープ検索フィルター
export interface BottleKeepSearchFilter {
  customerId?: string;
  productId?: number;
  status?: BottleKeepStatus;
  storageLocation?: string;
  searchTerm?: string; // 顧客名・商品名検索
  expiringWithin?: number; // 指定日数以内に期限切れ
  lowAmount?: boolean; // 残量少量
  sortBy?: "expiryDate" | "openedDate" | "customerName" | "productName";
  sortOrder?: "asc" | "desc";
}

// 顧客別ボトルキープサマリー
export interface CustomerBottleKeepSummary {
  customerId: string;
  customerName: string;
  totalBottles: number;
  activeBottles: number;
  totalValue: number;
  bottles: BottleKeepDetail[];
}

// ボトルキープレポート
export interface BottleKeepReport {
  period: {
    startDate: string;
    endDate: string;
  };
  statistics: {
    newBottles: number;
    consumedBottles: number;
    expiredBottles: number;
    totalUsage: number;
    averageConsumptionDays: number;
  };
  topCustomers: Array<{
    customer: Customer;
    bottleCount: number;
    totalValue: number;
  }>;
  topProducts: Array<{
    product: Product;
    bottleCount: number;
    totalValue: number;
  }>;
}

// ボトルキープ期限管理
export interface ExpiryManagement {
  expiringToday: BottleKeepDetail[];
  expiringThisWeek: BottleKeepDetail[];
  expiringThisMonth: BottleKeepDetail[];
  expired: BottleKeepDetail[];
}

// ボトルキープ在庫状況
export interface BottleKeepInventory {
  storageLocation: string;
  bottles: BottleKeepDetail[];
  totalBottles: number;
  totalValue: number;
  capacity?: number;
  utilizationRate?: number;
}
