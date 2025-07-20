import { describe, it, expect, vi, beforeEach } from "vitest";
import { CastService } from "../cast.service";
import { createClient } from "@/lib/supabase/client";
import type {
  CreateCastData,
  UpdateCastProfileData,
  CreateCastPerformanceData,
} from "@/types/cast.types";

vi.mock("@/lib/supabase/client");

describe("CastService", () => {
  let castService: CastService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "test-user-id" } },
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createClient as any).mockReturnValue(mockSupabase);
    castService = new CastService();
  });

  describe("createCast", () => {
    it("should create a new cast profile", async () => {
      const createData: CreateCastData = {
        staffId: "123e4567-e89b-12d3-a456-426614174000",
        stageName: "テストキャスト",
        hourlyRate: 3000,
        backPercentage: 50,
      };

      const mockCast = {
        id: "223e4567-e89b-12d3-a456-426614174001",
        staff_id: "123e4567-e89b-12d3-a456-426614174000",
        stage_name: "テストキャスト",
        hourly_rate: 3000,
        back_percentage: 50,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockSupabase.single.mockResolvedValue({ data: mockCast, error: null });

      const result = await castService.createCast(createData);

      expect(mockSupabase.from).toHaveBeenCalledWith("casts_profile");
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(result).toEqual({
        id: "223e4567-e89b-12d3-a456-426614174001",
        staffId: "123e4567-e89b-12d3-a456-426614174000",
        stageName: "テストキャスト",
        hourlyRate: 3000,
        backPercentage: 50,
        isActive: true,
        birthday: null,
        bloodType: null,
        height: null,
        threeSize: null,
        hobby: null,
        specialSkill: null,
        selfIntroduction: null,
        profileImageUrl: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });
    });

    it("should handle duplicate staff ID error", async () => {
      const createData: CreateCastData = {
        staffId: "123e4567-e89b-12d3-a456-426614174000",
        stageName: "テストキャスト",
        hourlyRate: 3000,
        backPercentage: 50,
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "Duplicate key" },
      });

      await expect(castService.createCast(createData)).rejects.toThrow(
        "このスタッフIDは既にキャストとして登録されています"
      );
    });
  });

  describe("updateCastProfile", () => {
    it("should allow cast to update their own profile", async () => {
      const updateData: UpdateCastProfileData = {
        stageName: "新しいステージ名",
        hobby: "カラオケ",
      };

      const mockUpdatedCast = {
        id: "223e4567-e89b-12d3-a456-426614174001",
        staff_id: "123e4567-e89b-12d3-a456-426614174000",
        stage_name: "新しいステージ名",
        hobby: "カラオケ",
        hourly_rate: 3000,
        back_percentage: 50,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedCast,
        error: null,
      });

      const result = await castService.updateCastProfile(
        "123e4567-e89b-12d3-a456-426614174000",
        updateData
      );

      expect(mockSupabase.from).toHaveBeenCalledWith("casts_profile");
      expect(mockSupabase.update).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith(
        "staff_id",
        "123e4567-e89b-12d3-a456-426614174000"
      );
      expect(result.stageName).toBe("新しいステージ名");
      expect(result.hobby).toBe("カラオケ");
    });
  });

  describe("searchCasts", () => {
    it("should search casts by stage name", async () => {
      const mockCasts = [
        {
          id: "323e4567-e89b-12d3-a456-426614174002",
          staff_id: "423e4567-e89b-12d3-a456-426614174003",
          stage_name: "さくら",
          hourly_rate: 3000,
          back_percentage: 50,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "523e4567-e89b-12d3-a456-426614174004",
          staff_id: "623e4567-e89b-12d3-a456-426614174005",
          stage_name: "さくらこ",
          hourly_rate: 3500,
          back_percentage: 60,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockSupabase.range.mockResolvedValue({ data: mockCasts, error: null });

      const result = await castService.searchCasts({ query: "さくら" });

      expect(mockSupabase.from).toHaveBeenCalledWith("casts_profile");
      expect(mockSupabase.ilike).toHaveBeenCalledWith("stage_name", "%さくら%");
      expect(result).toHaveLength(2);
      expect(result[0].stageName).toBe("さくら");
    });
  });

  describe("createCastPerformance", () => {
    it("should record cast performance data", async () => {
      const performanceData: CreateCastPerformanceData = {
        castId: "223e4567-e89b-12d3-a456-426614174001",
        date: "2024-01-01",
        shimeiCount: 5,
        dohanCount: 2,
        salesAmount: 150000,
        drinkCount: 10,
      };

      const mockPerformance = {
        id: "723e4567-e89b-12d3-a456-426614174006",
        cast_id: "223e4567-e89b-12d3-a456-426614174001",
        date: "2024-01-01",
        shimei_count: 5,
        dohan_count: 2,
        sales_amount: 150000,
        drink_count: 10,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockSupabase.single.mockResolvedValue({
        data: mockPerformance,
        error: null,
      });

      const result = await castService.createCastPerformance(performanceData);

      expect(mockSupabase.from).toHaveBeenCalledWith("cast_performances");
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(result).toEqual({
        id: "723e4567-e89b-12d3-a456-426614174006",
        castId: "223e4567-e89b-12d3-a456-426614174001",
        date: "2024-01-01",
        shimeiCount: 5,
        dohanCount: 2,
        salesAmount: 150000,
        drinkCount: 10,
        createdBy: null,
        updatedBy: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });
    });
  });

  describe("getCastRanking", () => {
    it("should get cast ranking for a period", async () => {
      const mockRankingData = [
        {
          cast_id: "323e4567-e89b-12d3-a456-426614174002",
          cast_name: "さくら",
          total_shimei: 50,
          total_dohan: 20,
          total_sales: 1500000,
          total_drinks: 100,
          rank: 1,
        },
        {
          cast_id: "523e4567-e89b-12d3-a456-426614174004",
          cast_name: "あやか",
          total_shimei: 40,
          total_dohan: 15,
          total_sales: 1200000,
          total_drinks: 80,
          rank: 2,
        },
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockRankingData,
        error: null,
      });

      const result = await castService.getCastRanking(
        "2024-01-01",
        "2024-01-31"
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_cast_ranking", {
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        limit_count: 10,
      });
      expect(result).toHaveLength(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result[0] as any).cast_name).toBe("さくら");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result[0] as any).rank).toBe(1);
    });
  });

  describe("calculateCastCompensation", () => {
    it("should calculate cast compensation for a period", async () => {
      // Mock getCastById
      vi.spyOn(castService, "getCastById").mockResolvedValue({
        id: "223e4567-e89b-12d3-a456-426614174001",
        staffId: "123e4567-e89b-12d3-a456-426614174000",
        stageName: "テストキャスト",
        hourlyRate: 3000,
        backPercentage: 50,
        isActive: true,
        birthday: null,
        bloodType: null,
        height: null,
        threeSize: null,
        hobby: null,
        specialSkill: null,
        selfIntroduction: null,
        profileImageUrl: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      // Mock getCastPerformances
      vi.spyOn(castService, "getCastPerformances").mockResolvedValue([
        {
          id: "823e4567-e89b-12d3-a456-426614174007",
          castId: "223e4567-e89b-12d3-a456-426614174001",
          date: "2024-01-01",
          shimeiCount: 5,
          dohanCount: 2,
          salesAmount: 150000,
          drinkCount: 10,
          createdBy: null,
          updatedBy: null,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "923e4567-e89b-12d3-a456-426614174008",
          castId: "223e4567-e89b-12d3-a456-426614174001",
          date: "2024-01-02",
          shimeiCount: 3,
          dohanCount: 1,
          salesAmount: 100000,
          drinkCount: 8,
          createdBy: null,
          updatedBy: null,
          createdAt: "2024-01-02T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
      ]);

      const result = await castService.calculateCastCompensation(
        "223e4567-e89b-12d3-a456-426614174001",
        "2024-01-01",
        "2024-01-31"
      );

      expect(result.castId).toBe("223e4567-e89b-12d3-a456-426614174001");
      expect(result.period).toBe("2024-01-01 - 2024-01-31");
      expect(result.workHours).toBe(12); // 2 days * 6 hours
      expect(result.hourlyWage).toBe(36000); // 12 hours * 3000
      expect(result.backAmount).toBe(125000); // (150000 + 100000) * 50%
      expect(result.totalAmount).toBe(161000); // 36000 + 125000
    });
  });

  describe("calculateMultipleCastsCompensation", () => {
    it("should calculate compensation for multiple casts", async () => {
      const castIds = ["cast-1", "cast-2"];
      const startDate = "2024-01-01";
      const endDate = "2024-01-31";

      // Mock for cast 1
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          hourly_wage: 2000,
          commission_rate: { bottle_percent: 0.2 },
        },
        error: null,
      });

      // Mock getCastPerformances for cast 1
      vi.spyOn(castService, "getCastPerformances").mockResolvedValueOnce([
        {
          id: "perf-1",
          castId: "cast-1",
          date: "2024-01-15",
          shimeiCount: 3,
          dohanCount: 1,
          salesAmount: 50000,
          drinkCount: 5,
          createdBy: null,
          updatedBy: null,
          createdAt: "2024-01-15T00:00:00Z",
          updatedAt: "2024-01-15T00:00:00Z",
        },
      ]);

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          nickname: "Alice",
          staffs: { full_name: "Alice Smith" },
        },
        error: null,
      });

      // Mock for cast 2
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          hourly_wage: 1500,
          commission_rate: { bottle_percent: 0.15 },
        },
        error: null,
      });

      // Mock getCastPerformances for cast 2
      vi.spyOn(castService, "getCastPerformances").mockResolvedValueOnce([
        {
          id: "perf-2",
          castId: "cast-2",
          date: "2024-01-20",
          shimeiCount: 2,
          dohanCount: 0,
          salesAmount: 30000,
          drinkCount: 3,
          createdBy: null,
          updatedBy: null,
          createdAt: "2024-01-20T00:00:00Z",
          updatedAt: "2024-01-20T00:00:00Z",
        },
      ]);

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          nickname: "Bob",
          staffs: { full_name: "Bob Johnson" },
        },
        error: null,
      });

      const result = await castService.calculateMultipleCastsCompensation(
        castIds,
        startDate,
        endDate
      );

      expect(result).toHaveLength(2);
      expect(result[0].castName).toBe("Alice");
      expect(result[0].totalSales).toBe(50000);
      expect(result[1].castName).toBe("Bob");
      expect(result[1].totalSales).toBe(30000);
    });
  });
});
