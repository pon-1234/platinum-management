import { describe, it, expect, vi, beforeEach } from "vitest";
import { PayrollService } from "../payroll.service";
import { createClient } from "@/lib/supabase/client";

// Supabaseクライアントのモック
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

// date-fnsのモック
vi.mock("date-fns", () => ({
  format: vi.fn(() => "2024-01-01"),
  differenceInHours: vi.fn(() => 8),
}));

interface MockSupabase {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  data?: unknown;
  error?: unknown;
}

describe("PayrollService", () => {
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    // Supabaseクライアントのモックをリセット
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      gte: vi.fn(() => mockSupabase),
      lte: vi.fn(() => mockSupabase),
      not: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
      single: vi.fn(() => mockSupabase),
      insert: vi.fn(() => mockSupabase),
      rpc: vi.fn(),
    };
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
  });

  describe("getNominationTypes", () => {
    it("アクティブな指名タイプを取得できる", async () => {
      const mockData = [
        { id: "1", name: "VIP", back_percentage: 50, is_active: true },
        { id: "2", name: "Regular", back_percentage: 30, is_active: true },
      ];

      mockSupabase.select.mockReturnValue({
        ...mockSupabase,
        data: mockData,
        error: null,
      });

      const result = await PayrollService.getNominationTypes();

      expect(mockSupabase.from).toHaveBeenCalledWith("nomination_types");
      expect(mockSupabase.eq).toHaveBeenCalledWith("is_active", true);
      expect(mockSupabase.order).toHaveBeenCalledWith("back_percentage", {
        ascending: false,
      });
      expect(result).toEqual(mockData);
    });

    it("エラー時に例外をスローする", async () => {
      const mockError = new Error("Database error");

      mockSupabase.select.mockReturnValue({
        data: null,
        error: mockError,
      });

      await expect(PayrollService.getNominationTypes()).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("calculatePayroll", () => {
    it("給与計算を正しく実行できる", async () => {
      const castId = "test-hostess-id";
      const periodStart = new Date("2024-01-01");
      const periodEnd = new Date("2024-01-31");

      // モックデータの設定
      const mockRuleAssignment = {
        payroll_rule_id: "rule-id",
        payroll_rules: {
          base_hourly_rate: 3000,
          base_back_percentage: 40,
        },
      };

      const mockOrders = [
        {
          id: "1",
          price: 10000,
          quantity: 1,
          nomination_type_id: "type-1",
          nomination_fee: 1000,
          nomination_types: { back_percentage: 50 },
        },
      ];

      const mockAttendance = [
        {
          check_in_time: "2024-01-01T18:00:00",
          check_out_time: "2024-01-02T02:00:00",
        },
      ];

      // getActivePayrollRuleのモック
      mockSupabase.single.mockResolvedValueOnce({
        data: mockRuleAssignment,
        error: null,
      });

      // getSalesDataのモック（orders）
      mockSupabase.lte.mockReturnValueOnce({
        data: mockOrders,
        error: null,
      });

      // getWorkingHoursのモック（attendance）
      mockSupabase.not.mockReturnValueOnce({
        data: mockAttendance,
        error: null,
      });

      // calculateBackPayのモック（sales_tiers）
      mockSupabase.order.mockReturnValueOnce({
        data: [],
        error: null,
      });

      const result = await PayrollService.calculatePayroll(
        castId,
        periodStart,
        periodEnd
      );

      expect(result).toHaveProperty("castId", castId);
      expect(result).toHaveProperty("totalSales", 10000);
      expect(result).toHaveProperty("basePay", 24000); // 8時間 × 3000円
      expect(result).toHaveProperty("totalPay");
      expect(result.items).toHaveLength(3); // 基本給、売上バック、指名料
    });

    it("給与ルールが設定されていない場合にエラーをスローする", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        PayrollService.calculatePayroll("test-id", new Date(), new Date())
      ).rejects.toThrow("給与ルールが設定されていません");
    });
  });

  describe("saveCalculation", () => {
    it("計算結果を正しく保存できる", async () => {
      const calculation = {
        castId: "test-id",
        periodStart: new Date("2024-01-01"),
        periodEnd: new Date("2024-01-31"),
        ruleId: "rule-id",
        items: [
          {
            type: "base" as const,
            category: "base_salary",
            name: "基本給",
            baseAmount: 160,
            rate: 3000,
            calculatedAmount: 480000,
          },
        ],
        totalSales: 1000000,
        basePay: 480000,
        backPay: 400000,
        nominationPay: 50000,
        totalPay: 930000,
      };

      const mockCalculationId = "calc-id";
      const mockSavedData = {
        id: mockCalculationId,
        ...calculation,
      };

      // RPC関数のモック
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockCalculationId,
        error: null,
      });

      // 保存結果の取得モック
      mockSupabase.single.mockResolvedValueOnce({
        data: mockSavedData,
        error: null,
      });

      const result = await PayrollService.saveCalculation(calculation, "draft");

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "save_payroll_calculation",
        expect.any(Object)
      );
      expect(result).toEqual(mockSavedData);
    });

    it("保存エラー時に例外をスローする", async () => {
      const calculation = {
        castId: "test-id",
        periodStart: new Date(),
        periodEnd: new Date(),
        items: [],
        totalSales: 0,
        basePay: 0,
        backPay: 0,
        nominationPay: 0,
        totalPay: 0,
      };

      const mockError = new Error("Save failed");
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      await expect(PayrollService.saveCalculation(calculation)).rejects.toThrow(
        "Save failed"
      );
    });
  });

  describe("getCalculations", () => {
    it("計算履歴を取得できる", async () => {
      const mockData = [
        {
          id: "1",
          hostess_id: "test-id",
          calculation_period_start: "2024-01-01",
          calculation_period_end: "2024-01-31",
          net_amount: 930000,
        },
      ];

      mockSupabase.order.mockReturnValueOnce({
        data: mockData,
        error: null,
      });

      const result = await PayrollService.getCalculations("test-id");

      expect(mockSupabase.from).toHaveBeenCalledWith("payroll_calculations");
      expect(mockSupabase.eq).toHaveBeenCalledWith("hostess_id", "test-id");
      expect(result).toEqual(mockData);
    });
  });

  describe("バック率計算のテスト", () => {
    it("売上スライド制が正しく適用される", async () => {
      const mockRule = {
        base_back_percentage: 40,
      };

      const mockSalesData = {
        totalSales: 1500000,
        nominationCount: 10,
        nominationFees: 50000,
        orders: [],
      };

      const mockSlideRules = [
        { min_sales: 0, max_sales: 500000, back_percentage: 40 },
        { min_sales: 500000, max_sales: 1000000, back_percentage: 45 },
        { min_sales: 1000000, max_sales: null, back_percentage: 50 },
      ];

      mockSupabase.order.mockReturnValueOnce({
        data: mockSlideRules,
        error: null,
      });

      // calculateBackPayメソッドをテスト用に公開する必要があるため、
      // プライベートメソッドのテストは統合テストで行う
      const result = await (
        PayrollService as unknown as {
          calculateBackPay: (
            rule: unknown,
            salesData: unknown,
            ruleId: string
          ) => Promise<number>;
        }
      ).calculateBackPay(mockRule, mockSalesData, "rule-id");

      // 期待値: 500000*0.4 + 500000*0.45 + 500000*0.5 = 675000
      expect(result).toBe(675000);
    });

    it("スライドルールがない場合はデフォルトバック率を使用", async () => {
      const mockRule = {
        base_back_percentage: 40,
      };

      const mockSalesData = {
        totalSales: 1000000,
        nominationCount: 0,
        nominationFees: 0,
        orders: [],
      };

      mockSupabase.order.mockReturnValueOnce({
        data: [],
        error: null,
      });

      const result = await (
        PayrollService as unknown as {
          calculateBackPay: (
            rule: unknown,
            salesData: unknown,
            ruleId: string
          ) => Promise<number>;
        }
      ).calculateBackPay(mockRule, mockSalesData, "rule-id");

      expect(result).toBe(400000); // 1000000 * 0.4
    });
  });
});
