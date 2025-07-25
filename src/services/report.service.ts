import { BaseService } from "./base.service";
import type {
  Report,
  CreateReportData,
  UpdateReportData,
  ReportSearchParams,
  DailySalesReport,
  MonthlyReportSummary,
  MonthlySalesReport,
  CastPerformanceReport,
  CustomerReport,
  InventoryReport,
} from "@/types/report.types";
import { billingService } from "./billing.service";

export class ReportService extends BaseService {
  constructor() {
    super();
  }

  async createReport(data: CreateReportData): Promise<Report> {
    const staffId = await this.getCurrentStaffId();

    const { data: report, error } = await this.supabase
      .from("reports")
      .insert({
        type: data.type,
        title: data.title,
        description: data.description,
        data: data.data,
        created_by: staffId,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      this.handleError(error, "レポートの作成に失敗しました");
    }

    return this.mapToReport(report);
  }

  async getReportById(id: string): Promise<Report | null> {
    const { data, error } = await this.supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      this.handleError(error, "レポートの取得に失敗しました");
    }

    return this.mapToReport(data);
  }

  async searchReports(params: ReportSearchParams = {}): Promise<Report[]> {
    let query = this.supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (params.type) {
      query = query.eq("type", params.type);
    }

    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.startDate) {
      query = query.gte("created_at", params.startDate);
    }

    if (params.endDate) {
      query = query.lte("created_at", params.endDate);
    }

    if (params.createdBy) {
      query = query.eq("created_by", params.createdBy);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(
        params.offset,
        params.offset + (params.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      this.handleError(error, "レポートの検索に失敗しました");
    }

    return data.map(this.mapToReport);
  }

  async updateReport(id: string, data: UpdateReportData): Promise<Report> {
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.data !== undefined) updateData.data = data.data;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: report, error } = await this.supabase
      .from("reports")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.handleError(error, "レポートの更新に失敗しました");
    }

    return this.mapToReport(report);
  }

  async deleteReport(id: string): Promise<void> {
    const { error } = await this.supabase.from("reports").delete().eq("id", id);

    if (error) {
      this.handleError(error, "レポートの削除に失敗しました");
    }
  }

  // Report generation methods
  async generateDailySalesReport(date: string): Promise<DailySalesReport> {
    return billingService.generateDailyReport(date);
  }

  async generateMonthlySalesReport(
    year: number,
    month: number
  ): Promise<MonthlySalesReport> {
    const { data, error } = await this.supabase.rpc("get_monthly_sales", {
      report_year: year,
      report_month: month,
    });

    if (error) {
      this.handleError(error, "月次売上レポートの生成に失敗しました");
    }

    return data as MonthlySalesReport;
  }

  async generateCastPerformanceReport(
    castId: string,
    startDate: string,
    endDate: string
  ): Promise<CastPerformanceReport> {
    const { data, error } = await this.supabase.rpc("get_cast_performance", {
      start_date: startDate,
      end_date: endDate,
    });

    if (error) {
      this.handleError(error, "キャスト実績レポートの生成に失敗しました");
    }

    // Transform the data to match CastPerformanceReport interface
    const casts = data || [];

    // Add UI-compatible aliases
    const topCasts = casts.map(
      (cast: {
        castId: string;
        castName: string;
        totalOrders: number;
        totalSales: number;
      }) => ({
        ...cast,
        orderCount: cast.totalOrders, // alias for UI
        totalAmount: cast.totalSales, // alias for UI
      })
    );

    // Filter for specific cast if castId is provided
    const filteredCasts = castId
      ? topCasts.filter((cast) => cast.castId === castId)
      : topCasts;

    return {
      period: {
        startDate,
        endDate,
      },
      topCasts: filteredCasts,
    };
  }

  async generateCustomerReport(customerId: string): Promise<CustomerReport> {
    // Get customer basic info
    const { data: customer, error: customerError } = await this.supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (customerError) {
      this.handleError(customerError, "顧客情報の取得に失敗しました");
    }

    // Get customer visits
    const { data: visits, error: visitsError } = await this.supabase
      .from("visits")
      .select(
        `
        id,
        check_in_at,
        check_out_at,
        table_id,
        num_guests,
        status,
        billing_items (
          amount
        )
      `
      )
      .eq("customer_id", customerId)
      .order("check_in_at", { ascending: false });

    if (visitsError) {
      this.handleError(visitsError, "来店履歴の取得に失敗しました");
    }

    // Calculate statistics
    const totalVisits = visits?.length || 0;
    const totalSpent =
      visits?.reduce((sum, visit) => {
        const visitTotal =
          visit.billing_items?.reduce(
            (itemSum: number, item: { amount: number }) =>
              itemSum + item.amount,
            0
          ) || 0;
        return sum + visitTotal;
      }, 0) || 0;
    const averageSpending = totalVisits > 0 ? totalSpent / totalVisits : 0;

    return {
      customerId,
      customerName: customer.name,
      totalVisits,
      totalSpent,
      averageSpending,
      lastVisitDate: visits?.[0]?.check_in_at || null,
      visitHistory:
        visits?.map((visit) => ({
          visitId: visit.id,
          date: visit.check_in_at,
          amount:
            visit.billing_items?.reduce(
              (sum: number, item: { amount: number }) => sum + item.amount,
              0
            ) || 0,
        })) || [],
    };
  }

  // Additional methods for reports page
  async getMonthlySalesReport(
    year: number,
    month: number
  ): Promise<MonthlySalesReport> {
    return this.generateMonthlySalesReport(year, month);
  }

  async getCastPerformanceReport(
    startDate: string,
    endDate: string
  ): Promise<CastPerformanceReport> {
    return this.generateCastPerformanceReport("", startDate, endDate);
  }

  async getCustomerReport(customerId: string): Promise<CustomerReport> {
    return this.generateCustomerReport(customerId);
  }

  async getInventoryReport(date: string): Promise<InventoryReport> {
    return this.generateInventoryReport(date);
  }

  async getMonthlyReportSummary(
    year: number,
    month: number
  ): Promise<MonthlyReportSummary> {
    // Get monthly sales data
    const salesReport = await this.generateMonthlySalesReport(year, month);

    // Get customer count for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { data: customerCount, error: customerError } = await this.supabase
      .from("visits")
      .select("customer_id", { count: "exact", head: true })
      .gte("check_in_at", startDate.toISOString())
      .lte("check_in_at", endDate.toISOString())
      .not("customer_id", "is", null);

    if (customerError) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to get customer count:", customerError);
      }
    }

    // Get visit count for the month
    const { count: visitCount, error: visitError } = await this.supabase
      .from("visits")
      .select("*", { count: "exact", head: true })
      .gte("check_in_at", startDate.toISOString())
      .lte("check_in_at", endDate.toISOString())
      .eq("status", "completed");

    if (visitError) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to get visit count:", visitError);
      }
    }

    const totalRevenue = salesReport.totalRevenue || 0;
    const totalVisits = visitCount || 0;
    const averageRevenuePerVisit =
      totalVisits > 0 ? totalRevenue / totalVisits : 0;

    return {
      year,
      month,
      totalRevenue,
      totalCustomers: customerCount || 0,
      totalVisits,
      averageRevenuePerVisit,
      topProducts: salesReport.topProducts || [],
      topCasts: salesReport.topCasts || [],
    };
  }

  async generateInventoryReport(date: string): Promise<InventoryReport> {
    // Get all products with their current stock
    const { data: products, error: productsError } = await this.supabase
      .from("products")
      .select("*")
      .order("name");

    if (productsError) {
      this.handleError(productsError, "商品情報の取得に失敗しました");
    }

    // Get inventory movements for the specified date
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const { data: movements, error: movementsError } = await this.supabase
      .from("inventory_movements")
      .select(
        `
        *,
        product:products (name)
      `
      )
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: false });

    if (movementsError) {
      this.handleError(movementsError, "在庫移動の取得に失敗しました");
    }

    // Calculate low stock items
    const lowStockItems =
      products?.filter(
        (product) => product.stock_quantity <= product.low_stock_threshold
      ) || [];

    // Group movements by type
    const movementsSummary =
      movements?.reduce(
        (acc, movement) => {
          const type = movement.movement_type;
          if (!acc[type]) {
            acc[type] = { count: 0, totalQuantity: 0 };
          }
          acc[type].count++;
          acc[type].totalQuantity += Math.abs(movement.quantity);
          return acc;
        },
        {} as Record<string, { count: number; totalQuantity: number }>
      ) || {};

    return {
      date,
      totalProducts: products?.length || 0,
      lowStockCount: lowStockItems.length,
      totalMovements: movements?.length || 0,
      movementsSummary,
      lowStockItems: lowStockItems.map((item) => ({
        productId: item.id,
        productName: item.name,
        currentStock: item.stock_quantity,
        threshold: item.low_stock_threshold,
      })),
      recentMovements:
        movements?.slice(0, 10).map((movement) => ({
          movementId: movement.id,
          productName: movement.product?.name || "Unknown",
          type: movement.movement_type,
          quantity: movement.quantity,
          timestamp: movement.created_at,
        })) || [],
    };
  }

  async getMonthlySalesTrend(
    months: number = 6
  ): Promise<Array<{ month: string; sales: number }>> {
    const trends: Array<{ month: string; sales: number }> = [];
    const currentDate = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;

      try {
        const report = await this.generateMonthlySalesReport(year, month);
        trends.push({
          month: targetDate.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "short",
          }),
          sales: report.totalRevenue || 0,
        });
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error(`Failed to get sales for ${year}-${month}:`, error);
        }
        trends.push({
          month: targetDate.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "short",
          }),
          sales: 0,
        });
      }
    }

    return trends;
  }

  private mapToReport(data: {
    id: string;
    type: string;
    title: string;
    description: string;
    data: unknown;
    created_at: string;
    created_by: string;
    status: string;
  }): Report {
    return {
      id: data.id,
      type: data.type,
      title: data.title,
      description: data.description,
      data: data.data,
      createdAt: data.created_at,
      createdBy: data.created_by,
      status: data.status,
    };
  }
}

export const reportService = new ReportService();
