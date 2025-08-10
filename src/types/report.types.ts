export interface Report {
  id: string;
  type: ReportType;
  title: string;
  description?: string;
  data: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  status: ReportStatus;
}

export type ReportType =
  | "daily_sales"
  | "monthly_sales"
  | "attendance"
  | "inventory"
  | "cast_performance"
  | "compliance"
  | "custom";

export type ReportStatus = "draft" | "completed" | "archived";

export interface DailySalesReport {
  date: string;
  totalSales: number;
  totalTransactions: number;
  averageTransactionValue: number;
  paymentBreakdown: {
    cash: number;
    card: number;
    mixed: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  hourlyBreakdown: Array<{
    hour: number;
    sales: number;
    transactions: number;
  }>;
}

export interface MonthlyReportSummary {
  month: string;
  year: number;
  totalSales: number;
  totalDays: number;
  averageDailySales: number;
  bestDay: {
    date: string;
    sales: number;
  };
  worstDay: {
    date: string;
    sales: number;
  };
}

export interface MonthlySalesReport extends MonthlyReportSummary {
  productBreakdown: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  castBreakdown: Array<{
    castId: string;
    castName: string;
    totalSales: number;
    totalHours: number;
  }>;
}

export interface CastPerformanceReport {
  period: {
    startDate: string;
    endDate: string;
  };
  topCasts: Array<{
    castId: string;
    castName: string;
    totalSales: number;
    totalOrders: number;
    orderCount: number; // alias for totalOrders for UI compatibility
    totalAmount: number; // alias for totalSales for UI compatibility
    averageOrderValue: number;
    workingDays: number;
    rating: number;
  }>;
}

export interface CustomerReport {
  customerId: string;
  customerName: string;
  totalVisits: number;
  totalSpent: number;
  averageSpent: number;
  lastVisit: string;
  favoriteProducts: Array<{
    productId: string;
    productName: string;
    orderCount: number;
  }>;
  favoriteCasts?: Array<{
    castId: string;
    castName: string;
    nominationCount: number;
    attributedRevenue: number;
  }>;
}

export interface InventoryReport {
  date: string;
  lowStockItems: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    threshold: number;
  }>;
  movements: Array<{
    productId: string;
    productName: string;
    type: "in" | "out";
    quantity: number;
    reason: string;
  }>;
  totalValue: number;
}

export interface CreateReportData {
  type: ReportType;
  title: string;
  description?: string;
  data: Record<string, unknown>;
}

export interface UpdateReportData {
  title?: string;
  description?: string;
  data?: Record<string, unknown>;
  status?: ReportStatus;
}

export interface ReportSearchParams {
  type?: ReportType;
  status?: ReportStatus;
  startDate?: string;
  endDate?: string;
  createdBy?: string;
  limit?: number;
  offset?: number;
}
