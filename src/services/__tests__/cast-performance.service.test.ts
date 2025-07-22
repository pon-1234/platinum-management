import { describe, it, expect, vi, beforeEach } from "vitest";
import { CastPerformanceService } from "../cast-performance.service";
import { createClient } from "@/lib/supabase/client";
import type {
  CreateCastPerformanceData,
  UpdateCastPerformanceData,
} from "@/types/cast.types";

vi.mock("@/lib/supabase/client");

describe("CastPerformanceService", () => {
  let performanceService: CastPerformanceService;
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
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createClient as any).mockReturnValue(mockSupabase);
    performanceService = new CastPerformanceService();
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

      const result =
        await performanceService.createCastPerformance(performanceData);

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

  describe("updateCastPerformance", () => {
    it("should update cast performance data", async () => {
      const updateData: UpdateCastPerformanceData = {
        shimeiCount: 8,
        salesAmount: 200000,
      };

      const mockUpdatedPerformance = {
        id: "723e4567-e89b-12d3-a456-426614174006",
        cast_id: "223e4567-e89b-12d3-a456-426614174001",
        date: "2024-01-01",
        shimei_count: 8,
        dohan_count: 2,
        sales_amount: 200000,
        drink_count: 10,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUpdatedPerformance,
        error: null,
      });

      const result = await performanceService.updateCastPerformance(
        "723e4567-e89b-12d3-a456-426614174006",
        updateData
      );

      expect(mockSupabase.from).toHaveBeenCalledWith("cast_performances");
      expect(mockSupabase.update).toHaveBeenCalled();
      expect(result.shimeiCount).toBe(8);
      expect(result.salesAmount).toBe(200000);
    });
  });

  describe("getCastPerformances", () => {
    it("should get cast performances with filters", async () => {
      const mockPerformances = [
        {
          id: "823e4567-e89b-12d3-a456-426614174007",
          cast_id: "223e4567-e89b-12d3-a456-426614174001",
          date: "2024-01-01",
          shimei_count: 5,
          dohan_count: 2,
          sales_amount: 150000,
          drink_count: 10,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockSupabase.range.mockResolvedValue({
        data: mockPerformances,
        error: null,
      });

      const result = await performanceService.getCastPerformances({
        castId: "223e4567-e89b-12d3-a456-426614174001",
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("cast_performances");
      expect(mockSupabase.eq).toHaveBeenCalledWith(
        "cast_id",
        "223e4567-e89b-12d3-a456-426614174001"
      );
      expect(mockSupabase.gte).toHaveBeenCalledWith("date", "2024-01-01");
      expect(mockSupabase.lte).toHaveBeenCalledWith("date", "2024-01-31");
      expect(result).toHaveLength(1);
      expect(result[0].castId).toBe("223e4567-e89b-12d3-a456-426614174001");
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

      const result = await performanceService.getCastRanking(
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
});
