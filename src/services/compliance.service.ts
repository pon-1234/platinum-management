import { BaseService } from "./base.service";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type IdVerification = Database["public"]["Tables"]["id_verifications"]["Row"];
type IdVerificationInsert =
  Database["public"]["Tables"]["id_verifications"]["Insert"];
type IdVerificationUpdate =
  Database["public"]["Tables"]["id_verifications"]["Update"];
type ComplianceReport =
  Database["public"]["Tables"]["compliance_reports"]["Row"];
type ComplianceReportInsert =
  Database["public"]["Tables"]["compliance_reports"]["Insert"];
type ComplianceReportUpdate =
  Database["public"]["Tables"]["compliance_reports"]["Update"];

export interface IdVerificationWithCustomer extends IdVerification {
  customer: {
    id: string;
    name: string;
    phone_number: string | null;
  };
  verified_staff: {
    id: string;
    full_name: string;
  } | null;
}

export interface ComplianceReportWithStaff extends ComplianceReport {
  generated_staff: {
    id: string;
    full_name: string;
  };
}

export class ComplianceService extends BaseService {
  private supabase: SupabaseClient<Database>;
  constructor() {
    super();
    this.supabase = createClient();
  }

  // ID検証関連メソッド
  async createIdVerification(data: Omit<IdVerificationInsert, "verified_by">) {
    const staffId = await this.getCurrentStaffId(this.supabase);
    if (!staffId) throw new Error("スタッフIDが取得できません");

    const { data: verification, error } = await this.supabase
      .from("id_verifications")
      .insert({
        ...this.toSnakeCase(data),
        verified_by: staffId,
      })
      .select()
      .single();

    if (error) this.handleError(error);
    return this.toCamelCase(verification);
  }

  async updateIdVerification(id: string, data: IdVerificationUpdate) {
    const { data: verification, error } = await this.supabase
      .from("id_verifications")
      .update(this.toSnakeCase(data))
      .eq("id", id)
      .select()
      .single();

    if (error) this.handleError(error);
    return this.toCamelCase(verification);
  }

  async getIdVerification(id: string) {
    const { data, error } = await this.supabase
      .from("id_verifications")
      .select(
        `
        *,
        customer:customers!customer_id (
          id,
          name,
          phone_number
        ),
        verified_staff:staffs!verified_by (
          id,
          full_name
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) this.handleError(error);
    return this.toCamelCase(data) as IdVerificationWithCustomer;
  }

  async getIdVerificationsByCustomer(customerId: string) {
    const { data, error } = await this.supabase
      .from("id_verifications")
      .select(
        `
        *,
        customer:customers!customer_id (
          id,
          name,
          phone_number
        ),
        verified_staff:staffs!verified_by (
          id,
          full_name
        )
      `
      )
      .eq("customer_id", customerId)
      .order("verification_date", { ascending: false });

    if (error) this.handleError(error);
    return this.toCamelCase(data || []) as IdVerificationWithCustomer[];
  }

  async searchIdVerifications(params: {
    idType?: string;
    isVerified?: boolean;
    startDate?: Date;
    endDate?: Date;
  }) {
    let query = this.supabase.from("id_verifications").select(`
        *,
        customer:customers!customer_id (
          id,
          name,
          phone_number
        ),
        verified_staff:staffs!verified_by (
          id,
          full_name
        )
      `);

    if (params.idType) {
      query = query.eq("id_type", params.idType);
    }
    if (params.isVerified !== undefined) {
      query = query.eq("is_verified", params.isVerified);
    }
    if (params.startDate) {
      query = query.gte("verification_date", params.startDate.toISOString());
    }
    if (params.endDate) {
      query = query.lte("verification_date", params.endDate.toISOString());
    }

    const { data, error } = await query.order("verification_date", {
      ascending: false,
    });

    if (error) this.handleError(error);
    return this.toCamelCase(data || []) as IdVerificationWithCustomer[];
  }

  // コンプライアンスレポート関連メソッド
  async createComplianceReport(
    data: Omit<ComplianceReportInsert, "generated_by">
  ) {
    const staffId = await this.getCurrentStaffId(this.supabase);
    if (!staffId) throw new Error("スタッフIDが取得できません");

    const { data: report, error } = await this.supabase
      .from("compliance_reports")
      .insert({
        ...this.toSnakeCase(data),
        generated_by: staffId,
      })
      .select()
      .single();

    if (error) this.handleError(error);
    return this.toCamelCase(report);
  }

  async updateComplianceReport(id: string, data: ComplianceReportUpdate) {
    const { data: report, error } = await this.supabase
      .from("compliance_reports")
      .update(this.toSnakeCase(data))
      .eq("id", id)
      .select()
      .single();

    if (error) this.handleError(error);
    return this.toCamelCase(report);
  }

  async getComplianceReport(id: string) {
    const { data, error } = await this.supabase
      .from("compliance_reports")
      .select(
        `
        *,
        generated_staff:staffs!generated_by (
          id,
          full_name
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) this.handleError(error);
    return this.toCamelCase(data) as ComplianceReportWithStaff;
  }

  async searchComplianceReports(params: {
    reportType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    let query = this.supabase.from("compliance_reports").select(`
        *,
        generated_staff:staffs!generated_by (
          id,
          full_name
        )
      `);

    if (params.reportType) {
      query = query.eq("report_type", params.reportType);
    }
    if (params.status) {
      query = query.eq("status", params.status);
    }
    if (params.startDate) {
      query = query.gte("generated_at", params.startDate.toISOString());
    }
    if (params.endDate) {
      query = query.lte("generated_at", params.endDate.toISOString());
    }

    const { data, error } = await query.order("generated_at", {
      ascending: false,
    });

    if (error) this.handleError(error);
    return this.toCamelCase(data || []) as ComplianceReportWithStaff[];
  }

  // レポート生成関連メソッド
  async generateEmployeeList(periodStart: Date, periodEnd: Date) {
    const { data: staffList, error } = await this.supabase
      .from("staffs")
      .select(
        `
        *,
        casts_profile (
          nickname,
          hourly_wage
        ),
        time_records!time_records_staff_id_fkey (
          clock_in,
          clock_out
        )
      `
      )
      .gte("time_records.clock_in", periodStart.toISOString())
      .lte("time_records.clock_in", periodEnd.toISOString())
      .eq("is_active", true)
      .order("role", { ascending: true })
      .order("full_name", { ascending: true });

    if (error) this.handleError(error);

    // レポート生成ロジック
    const reportData = {
      report_type: "employee_list" as const,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      status: "generated" as const,
      file_path: null, // 実際のファイル生成は別途実装
    };

    const report = await this.createComplianceReport(reportData);

    return {
      report: this.toCamelCase(report),
      staffList: this.toCamelCase(staffList || []),
    };
  }

  async generateComplaintLog(periodStart: Date, periodEnd: Date) {
    // 苦情処理簿の生成ロジック（実際の苦情データモデルが必要）
    const reportData = {
      report_type: "complaint_log" as const,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      status: "generated" as const,
      file_path: null,
    };

    const report = await this.createComplianceReport(reportData);
    return report;
  }

  // 統計情報
  async getComplianceStats() {
    const [verificationStats, reportStats] = await Promise.all([
      this.getVerificationStats(),
      this.getReportStats(),
    ]);

    return {
      verifications: verificationStats,
      reports: reportStats,
    };
  }

  private async getVerificationStats() {
    const { data, error } = await this.supabase
      .from("id_verifications")
      .select("id_type, is_verified")
      .throwOnError();

    if (error) this.handleError(error);

    const stats = {
      total: data?.length || 0,
      verified: data?.filter((v) => v.is_verified).length || 0,
      pending: data?.filter((v) => !v.is_verified).length || 0,
      byType: {} as Record<string, number>,
    };

    data?.forEach((verification) => {
      stats.byType[verification.id_type] =
        (stats.byType[verification.id_type] || 0) + 1;
    });

    return stats;
  }

  private async getReportStats() {
    const { data, error } = await this.supabase
      .from("compliance_reports")
      .select("report_type, status")
      .throwOnError();

    if (error) this.handleError(error);

    const stats = {
      total: data?.length || 0,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    data?.forEach((report) => {
      stats.byType[report.report_type] =
        (stats.byType[report.report_type] || 0) + 1;
      stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;
    });

    return stats;
  }
}

export const complianceService = new ComplianceService();
