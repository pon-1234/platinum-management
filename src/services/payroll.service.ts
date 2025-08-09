import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";
import { startOfMonth, endOfMonth, format, differenceInHours } from "date-fns";

type PayrollRule = Database["public"]["Tables"]["payroll_rules"]["Row"];

export interface PayrollCalculationDetails {
  hostessId: string;
  periodStart: Date;
  periodEnd: Date;
  ruleId?: string;
  items: PayrollDetailItem[];
  totalSales: number;
  basePay: number;
  backPay: number;
  nominationPay: number;
  totalPay: number;
}

// 売上データの型定義
interface SalesData {
  totalSales: number;
  nominationCount: number;
  nominationFees: number;
  effectiveBackRate?: number;
  orders: OrderItem[];
}

interface OrderItem {
  id: string;
  price: number;
  quantity: number;
  nomination_type_id?: string;
  nomination_fee?: number;
  visits?: {
    cast_id: string;
    check_in_time: string;
  };
  nomination_types?: {
    id: string;
    back_percentage: number;
  };
}

interface AttendanceRecord {
  check_in_time: string;
  check_out_time: string;
}

interface SlideRule {
  min_sales: number;
  max_sales?: number;
  back_percentage: number;
}

export interface PayrollDetailItem {
  type: "base" | "back" | "nomination" | "bonus" | "deduction";
  category: string;
  name: string;
  baseAmount: number;
  rate?: number;
  calculatedAmount: number;
  quantity?: number;
  unitPrice?: number;
  description?: string;
  metadata?: {
    hours?: number;
    sales?: number;
    count?: number;
  };
}

export class PayrollService {
  static async getActivePayrollRule(
    hostessId: string,
    date: Date = new Date()
  ) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("hostess_payroll_rules")
      .select(
        `
        *,
        payroll_rules!inner(*)
      `
      )
      .eq("hostess_id", hostessId)
      .eq("is_active", true)
      .lte("assigned_from", format(date, "yyyy-MM-dd"))
      .or(
        `assigned_until.is.null,assigned_until.gte.${format(date, "yyyy-MM-dd")}`
      )
      .single();

    if (error) throw error;
    return data;
  }

  static async getNominationTypes() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("nomination_types")
      .select("*")
      .eq("is_active", true)
      .order("back_percentage", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async calculatePayroll(
    hostessId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<PayrollCalculationDetails> {
    // 適用される給与ルールを取得
    const ruleAssignment = await this.getActivePayrollRule(
      hostessId,
      periodEnd
    );
    if (!ruleAssignment) {
      throw new Error("給与ルールが設定されていません");
    }

    const rule = ruleAssignment.payroll_rules;

    // 期間中の売上データを取得
    const salesData = await this.getSalesData(
      hostessId,
      periodStart,
      periodEnd
    );

    // 期間中の勤務時間を取得
    const workingHours = await this.getWorkingHours(
      hostessId,
      periodStart,
      periodEnd
    );

    // 基本給の計算
    const basePay = this.calculateBasePay(rule, workingHours);

    // バック率による歩合給の計算
    const backPay = await this.calculateBackPay(
      rule,
      salesData,
      ruleAssignment.payroll_rule_id
    );

    // 指名料の計算
    const nominationPay = await this.calculateNominationPay(salesData);

    // 合計額の計算
    const totalPay = basePay + backPay + nominationPay;

    // 詳細項目の作成
    const items: PayrollDetailItem[] = [
      {
        type: "base",
        category: "base_salary",
        name: "基本給",
        baseAmount: workingHours,
        rate: rule.base_hourly_rate,
        calculatedAmount: basePay,
        metadata: { hours: workingHours },
      },
      {
        type: "back",
        category: "sales_back",
        name: "売上バック",
        baseAmount: salesData.totalSales,
        rate: salesData.effectiveBackRate,
        calculatedAmount: backPay,
        metadata: { sales: salesData.totalSales },
      },
      {
        type: "nomination",
        category: "nomination_fee",
        name: "指名料",
        baseAmount: salesData.nominationCount,
        calculatedAmount: nominationPay,
        metadata: { count: salesData.nominationCount },
      },
    ];

    return {
      hostessId,
      periodStart,
      periodEnd,
      ruleId: ruleAssignment.payroll_rule_id,
      items,
      totalSales: salesData.totalSales,
      basePay,
      backPay,
      nominationPay,
      totalPay,
    };
  }

  private static async getSalesData(
    hostessId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SalesData> {
    const supabase = createClient();

    // Use the new payroll_revenue_facts view
    const { data: revenueData, error } = await supabase
      .from("payroll_revenue_facts")
      .select("*")
      .eq("cast_id", hostessId)
      .gte("work_date", periodStart.toISOString().split("T")[0])
      .lte("work_date", periodEnd.toISOString().split("T")[0]);

    if (error) throw error;

    const totalSales =
      revenueData?.reduce(
        (sum, record) => sum + (record.attributed_revenue || 0),
        0
      ) || 0;

    const nominationCount =
      revenueData?.filter((record) => record.nomination_type).length || 0;

    const nominationFees =
      revenueData?.reduce(
        (sum, record) =>
          sum +
          (record.attribution_type === "nomination"
            ? record.attribution_amount
            : 0),
        0
      ) || 0;

    // Calculate effective back rate (weighted average)
    const effectiveBackRate = revenueData?.length
      ? revenueData.reduce(
          (sum, record) => sum + (record.effective_back_rate || 0),
          0
        ) / revenueData.length
      : 0;

    return {
      totalSales,
      nominationCount,
      nominationFees,
      effectiveBackRate,
      orders: [], // Orders are now handled through the view
    };
  }

  private static async getWorkingHours(
    hostessId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    const supabase = createClient();
    const { data: attendance, error } = await supabase
      .from("cast_attendance")
      .select("check_in_time, check_out_time")
      .eq("cast_id", hostessId)
      .gte("check_in_time", periodStart.toISOString())
      .lte("check_in_time", periodEnd.toISOString())
      .not("check_out_time", "is", null);

    if (error) throw error;

    let totalHours = 0;
    const typedAttendance = (attendance || []) as AttendanceRecord[];

    typedAttendance.forEach((record) => {
      const checkIn = new Date(record.check_in_time);
      const checkOut = new Date(record.check_out_time);
      const hours = differenceInHours(checkOut, checkIn);
      totalHours += hours;
    });

    return totalHours;
  }

  private static calculateBasePay(rule: PayrollRule, workingHours: number) {
    return workingHours * rule.base_hourly_rate;
  }

  private static async calculateBackPay(
    rule: PayrollRule,
    salesData: SalesData,
    ruleId: string
  ): Promise<number> {
    // 売上スライドルールを取得
    const supabase = createClient();
    const { data: slideRules, error } = await supabase
      .from("sales_tiers")
      .select("*")
      .eq("rule_id", ruleId)
      .order("min_sales", { ascending: true });

    if (error) throw error;

    let backPay = 0;
    const totalSales = salesData.totalSales;
    const typedSlideRules = (slideRules || []) as SlideRule[];

    if (typedSlideRules.length > 0) {
      // 売上スライド制の適用
      for (const tier of typedSlideRules) {
        if (totalSales >= tier.min_sales) {
          const tierMax = tier.max_sales || totalSales;
          const tierSales = Math.min(totalSales, tierMax) - tier.min_sales;
          backPay += tierSales * (tier.back_percentage / 100);
        }
      }
    } else {
      // デフォルトのバック率を適用
      backPay = totalSales * (rule.base_back_percentage / 100);
    }

    return Math.floor(backPay);
  }

  private static async calculateNominationPay(
    salesData: SalesData
  ): Promise<number> {
    let nominationPay = 0;
    const orders = salesData.orders;

    for (const order of orders) {
      if (order.nomination_type_id && order.nomination_types) {
        const nominationType = order.nomination_types;
        nominationPay += order.price * (nominationType.back_percentage / 100);
      }
    }

    return Math.floor(nominationPay);
  }

  static async saveCalculation(
    calculation: PayrollCalculationDetails,
    status: "draft" | "confirmed" | "approved" = "draft"
  ) {
    const supabase = createClient();

    // 詳細項目をJSON形式に変換
    const details = calculation.items.map((item) => ({
      detail_type: item.type || "other",
      item_name: item.name,
      base_amount: item.baseAmount || 0,
      rate_percentage: item.rate || null,
      calculated_amount: item.calculatedAmount || 0,
      quantity: item.quantity || null,
      unit_price: item.unitPrice || null,
      description: item.description || null,
    }));

    // RPC関数を使用してトランザクション内で保存
    const { data: calculationId, error } = await supabase.rpc(
      "save_payroll_calculation",
      {
        p_hostess_id: calculation.hostessId,
        p_period_start: format(calculation.periodStart, "yyyy-MM-dd"),
        p_period_end: format(calculation.periodEnd, "yyyy-MM-dd"),
        p_rule_id: calculation.ruleId || null,
        p_base_salary: calculation.basePay,
        p_back_amount: calculation.backPay,
        p_bonus_amount: calculation.nominationPay,
        p_deductions: 0, // TODO: 控除計算を実装後に更新
        p_gross_amount: calculation.totalPay,
        p_net_amount: calculation.totalPay, // TODO: 控除適用後の金額を計算
        p_status: status,
        p_details: details,
      }
    );

    if (error) throw error;

    // 保存された計算結果を取得して返す
    const { data: payrollCalc, error: fetchError } = await supabase
      .from("payroll_calculations")
      .select("*")
      .eq("id", calculationId)
      .single();

    if (fetchError) throw fetchError;

    return payrollCalc;
  }

  static async getCalculations(
    hostessId?: string,
    periodStart?: Date,
    periodEnd?: Date
  ) {
    const supabase = createClient();
    let query = supabase.from("payroll_calculations").select(`
        *,
        casts_profile!inner(
          id,
          staff_id,
          staffs!inner(
            full_name,
            full_name_kana
          )
        )
      `);

    if (hostessId) {
      query = query.eq("hostess_id", hostessId);
    }

    if (periodStart && periodEnd) {
      query = query
        .gte("period_start", format(periodStart, "yyyy-MM-dd"))
        .lte("period_end", format(periodEnd, "yyyy-MM-dd"));
    }

    const { data, error } = await query.order("period_start", {
      ascending: false,
    });

    if (error) throw error;
    return data;
  }

  static async approveCalculation(calculationId: string, approvedBy: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("payroll_calculations")
      .update({
        status: "approved",
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq("id", calculationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async calculateMonthlyPayroll(targetMonth: Date) {
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);

    // 全キャストを取得
    const supabase = createClient();
    const { data: casts, error: castsError } = await supabase
      .from("casts_profile")
      .select("*")
      .eq("is_active", true);

    if (castsError) throw castsError;

    const calculations = [];

    for (const cast of casts || []) {
      try {
        const calculation = await this.calculatePayroll(
          cast.id,
          monthStart,
          monthEnd
        );

        const saved = await this.saveCalculation(calculation, "draft");
        calculations.push(saved);
      } catch (error) {
        console.error(
          `Failed to calculate payroll for cast ${cast.id}:`,
          error
        );
      }
    }

    return calculations;
  }
}
