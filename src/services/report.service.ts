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
    // Implementation would go here
    throw new Error("Not implemented");
  }

  async generateCastPerformanceReport(
    castId: string,
    startDate: string,
    endDate: string
  ): Promise<CastPerformanceReport> {
    // Implementation would go here
    throw new Error("Not implemented");
  }

  async generateCustomerReport(customerId: string): Promise<CustomerReport> {
    // Implementation would go here
    throw new Error("Not implemented");
  }

  async generateInventoryReport(date: string): Promise<InventoryReport> {
    // Implementation would go here
    throw new Error("Not implemented");
  }

  private mapToReport(data: any): Report {
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
