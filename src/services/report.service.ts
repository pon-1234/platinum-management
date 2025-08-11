import { BaseService } from "./base.service";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  Report,
  ReportType,
  ReportStatus,
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
  private supabase: SupabaseClient<Database>;

  constructor() {
    super();
    this.supabase = createClient();
  }

  async createReport(data: CreateReportData): Promise<Report> {
    const staffId = await this.getCurrentStaffId(this.supabase);

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
    const dailyReport = await billingService.generateDailyReport(date);

    // Transform DailyReport to DailySalesReport
    return {
      date: dailyReport.date,
      totalSales: dailyReport.totalSales,
      totalTransactions: dailyReport.totalVisits,
      averageTransactionValue:
        dailyReport.totalVisits > 0
          ? dailyReport.totalSales / dailyReport.totalVisits
          : 0,
      paymentBreakdown: {
        cash: dailyReport.totalCash,
        card: dailyReport.totalCard,
        mixed:
          dailyReport.totalSales -
          dailyReport.totalCash -
          dailyReport.totalCard,
      },
      topProducts: dailyReport.topProducts.map((product) => ({
        productId: product.productId.toString(),
        productName: product.productName,
        quantity: product.quantity,
        revenue: product.totalAmount,
      })),
      hourlyBreakdown: [], // Not available in DailyReport
    };
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
    interface CastData {
      castId: string;
      castName: string;
      totalOrders: number;
      totalSales: number;
    }

    const topCasts = casts.map((cast: CastData) => ({
      ...cast,
      orderCount: cast.totalOrders, // alias for UI
      totalAmount: cast.totalSales, // alias for UI
    }));

    // Filter for specific cast if castId is provided
    const filteredCasts = castId
      ? topCasts.filter((cast: (typeof topCasts)[0]) => cast.castId === castId)
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

    // Get customer visits with orders, cast engagements, and basic bill attributions
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
        order_items (
          id,
          product_id,
          quantity,
          total_price,
          product:products (
            id,
            name
          ),
          bill_item_attributions (
            cast_id,
            attribution_percentage,
            attribution_amount
          )
        ),
        cast_engagements (
          cast_id,
          role,
          nomination_type_id,
          fee_amount
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

    // Calculate total spent from order items
    const totalSpent =
      visits?.reduce((sum, visit: Record<string, unknown>) => {
        const orderItems = visit.order_items as
          | Array<{
              total_price?: number;
            }>
          | undefined;
        const visitTotal =
          orderItems?.reduce(
            (itemSum: number, item) => itemSum + (item.total_price || 0),
            0
          ) || 0;
        return sum + visitTotal;
      }, 0) || 0;

    const averageSpending = totalVisits > 0 ? totalSpent / totalVisits : 0;

    // Calculate favorite products
    const productCounts = new Map<string, { name: string; count: number }>();
    // Calculate cast engagements and attribution summaries
    const castCounts = new Map<
      string,
      { name?: string; count: number; totalAttributed: number }
    >();
    visits?.forEach((visit: Record<string, unknown>) => {
      const orderItems = visit.order_items as
        | Array<{
            id: number;
            product_id?: number;
            quantity?: number;
            product?: { name?: string };
            bill_item_attributions?: Array<{
              cast_id: string;
              attribution_percentage?: number;
              attribution_amount?: number;
            }>;
          }>
        | undefined;

      orderItems?.forEach((item) => {
        if (item.product_id && item.product?.name) {
          const existing = productCounts.get(item.product_id.toString());
          if (existing) {
            existing.count += item.quantity || 1;
          } else {
            productCounts.set(item.product_id.toString(), {
              name: item.product.name,
              count: item.quantity || 1,
            });
          }
        }
        // Aggregate cast attributions
        if (item.bill_item_attributions) {
          item.bill_item_attributions.forEach((attr) => {
            const key = attr.cast_id;
            const prev = castCounts.get(key) || {
              name: undefined,
              count: 0,
              totalAttributed: 0,
            };
            castCounts.set(key, {
              ...prev,
              totalAttributed:
                prev.totalAttributed + (attr.attribution_amount || 0),
            });
          });
        }
      });

      // Count engaged casts (nominations, inhouse etc.)
      const engagements = visit.cast_engagements as
        | Array<{
            cast_id: string;
            role?: string;
            nomination_type_id?: string;
            fee_amount?: number;
          }>
        | undefined;
      engagements?.forEach((eng) => {
        const key = eng.cast_id;
        const prev = castCounts.get(key) || {
          name: undefined,
          count: 0,
          totalAttributed: 0,
        };
        castCounts.set(key, { ...prev, count: prev.count + 1 });
      });
    });

    const favoriteProducts = Array.from(productCounts.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        orderCount: data.count,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5); // Top 5 products

    // Build favorite casts by engagements and attributed revenue
    let favoriteCasts = Array.from(castCounts.entries())
      .map(([castId, data]) => ({
        castId,
        castName: data.name || "", // could be filled by a join if needed
        nominationCount: data.count,
        attributedRevenue: data.totalAttributed,
      }))
      .sort((a, b) => b.attributedRevenue - a.attributedRevenue)
      .slice(0, 5);

    // Fill cast names if possible
    try {
      const castIds = favoriteCasts.map((c) => c.castId).filter(Boolean);
      if (castIds.length > 0) {
        const { data: castRows } = await this.supabase
          .from("casts_profile")
          .select("id, staffs(full_name)")
          .in("id", castIds);
        const idToName = new Map<string, string>();
        type CastRow = {
          id: string;
          staffs: { full_name: string | null } | null;
        };
        (castRows as CastRow[] | null | undefined)?.forEach((r) => {
          if (r?.id) idToName.set(r.id, r?.staffs?.full_name || "");
        });
        favoriteCasts = favoriteCasts.map((c) => ({
          ...c,
          castName: idToName.get(c.castId) || c.castName,
        }));
      }
    } catch (e) {
      // ignore name fill failure
    }

    return {
      customerId,
      customerName: customer.name,
      totalVisits,
      totalSpent,
      averageSpent: averageSpending,
      lastVisit:
        ((visits?.[0] as Record<string, unknown>)?.check_in_at as string) || "",
      favoriteProducts,
      favoriteCasts,
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

    // Extract the MonthlyReportSummary fields from the salesReport
    return {
      month: salesReport.month,
      year: salesReport.year,
      totalSales: salesReport.totalSales,
      totalDays: salesReport.totalDays,
      averageDailySales: salesReport.averageDailySales,
      bestDay: salesReport.bestDay,
      worstDay: salesReport.worstDay,
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

    // Calculate total inventory value
    const totalValue =
      products?.reduce(
        (sum, product) =>
          sum + (product.stock_quantity || 0) * (product.price || 0),
        0
      ) || 0;

    return {
      date,
      lowStockItems: lowStockItems.map((item) => ({
        productId: item.id.toString(),
        productName: item.name,
        currentStock: item.stock_quantity,
        threshold: item.low_stock_threshold,
      })),
      movements:
        movements?.map((movement) => ({
          productId: movement.product_id.toString(),
          productName: movement.product?.name || "Unknown",
          type:
            movement.movement_type === "adjustment_in" ||
            movement.movement_type === "purchase"
              ? ("in" as const)
              : ("out" as const),
          quantity: Math.abs(movement.quantity),
          reason: movement.reason || movement.movement_type,
        })) || [],
      totalValue,
    };
  }

  async getMonthlySalesTrend(
    months: number = 6
  ): Promise<Array<{ month: string; sales: number }>> {
    const currentDate = new Date();
    const promises: Array<Promise<{ month: string; sales: number }>> = [];

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;

      const promise = this.generateMonthlySalesReport(year, month)
        .then((report) => ({
          month: targetDate.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "short",
          }),
          sales: report.totalSales || 0,
        }))
        .catch((error) => {
          if (process.env.NODE_ENV === "development") {
            console.error(`Failed to get sales for ${year}-${month}:`, error);
          }
          return {
            month: targetDate.toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "short",
            }),
            sales: 0,
          };
        });

      promises.push(promise);
    }

    const results = await Promise.all(promises);
    return results.reverse();
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
      type: data.type as ReportType,
      title: data.title,
      description: data.description,
      data: data.data as Record<string, unknown>,
      createdAt: data.created_at,
      createdBy: data.created_by,
      status: data.status as ReportStatus,
    };
  }
}

export const reportService = new ReportService();
