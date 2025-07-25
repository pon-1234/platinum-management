import { describe, it, expect, vi, beforeEach } from "vitest";
import { CastService } from "../cast.service";
import { CastPerformanceService } from "../cast-performance.service";
import { CastCompensationService } from "../cast-compensation.service";
import { createClient } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client");

/**
 * @design_doc See doc.md - Integration Tests for Cast Services
 * @related_to CastService, CastPerformanceService, CastCompensationService
 * @known_issues Tests use mocked Supabase client
 */
describe("Cast Services Integration", () => {
  let castService: CastService;
  let performanceService: CastPerformanceService;
  let compensationService: CastCompensationService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  // Mock data constants removed to fix unused variable warnings
  // Data is defined inline in tests where needed

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
      in: vi.fn().mockReturnThis(),
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
    performanceService = new CastPerformanceService();
    compensationService = new CastCompensationService(
      castService,
      performanceService
    );
  });

  describe("Service Chain Integration", () => {
    it("should calculate compensation using complete service chain", async () => {
      // Setup mock chain for getCastById
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);

      // Mock cast data
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          staff_id: "223e4567-e89b-12d3-a456-426614174001",
          stage_name: "テストキャスト",
          hourly_rate: 3000,
          back_percentage: 50,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      // Setup mock chain for getCastPerformances
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.gte.mockReturnValueOnce(mockSupabase);
      mockSupabase.lte.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockReturnValueOnce(mockSupabase);

      // Mock performance data
      mockSupabase.range.mockResolvedValueOnce({
        data: [
          {
            id: "323e4567-e89b-12d3-a456-426614174002",
            cast_id: "123e4567-e89b-12d3-a456-426614174000",
            date: "2024-01-15",
            shimei_count: 5,
            dohan_count: 2,
            sales_amount: 150000,
            drink_count: 10,
            created_at: "2024-01-15T00:00:00Z",
            updated_at: "2024-01-15T00:00:00Z",
          },
        ],
        error: null,
      });

      const result = await compensationService.calculateCastCompensation(
        "123e4567-e89b-12d3-a456-426614174000",
        "2024-01-01",
        "2024-01-31"
      );

      expect(result.castId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.cast.stageName).toBe("テストキャスト");
      expect(result.workHours).toBe(6); // 1 day * 6 hours
      expect(result.hourlyWage).toBe(18000); // 6 hours * 3000
      expect(result.backAmount).toBe(75000); // 150000 * 50%
      expect(result.totalAmount).toBe(93000); // 18000 + 75000
    });

    it("should handle performance creation and immediate retrieval", async () => {
      const performanceData = {
        castId: "123e4567-e89b-12d3-a456-426614174000",
        date: "2024-01-20",
        shimeiCount: 3,
        dohanCount: 1,
        salesAmount: 100000,
        drinkCount: 5,
      };

      // Mock for staff ID fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "test-staff-id" },
        error: null,
      });

      // Mock performance creation
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "223e4567-e89b-12d3-a456-426614174001",
          cast_id: "123e4567-e89b-12d3-a456-426614174000",
          date: "2024-01-20",
          shimei_count: 3,
          dohan_count: 1,
          sales_amount: 100000,
          drink_count: 5,
          created_at: "2024-01-20T00:00:00Z",
          updated_at: "2024-01-20T00:00:00Z",
        },
        error: null,
      });

      // Mock performance retrieval
      mockSupabase.range.mockResolvedValueOnce({
        data: [
          {
            id: "223e4567-e89b-12d3-a456-426614174001",
            cast_id: "123e4567-e89b-12d3-a456-426614174000",
            date: "2024-01-20",
            shimei_count: 3,
            dohan_count: 1,
            sales_amount: 100000,
            drink_count: 5,
            created_at: "2024-01-20T00:00:00Z",
            updated_at: "2024-01-20T00:00:00Z",
          },
        ],
        error: null,
      });

      // Create performance
      const createdPerformance =
        await performanceService.createCastPerformance(performanceData);

      expect(createdPerformance.castId).toBe(
        "123e4567-e89b-12d3-a456-426614174000"
      );
      expect(createdPerformance.salesAmount).toBe(100000);

      // Retrieve performances
      const performances = await performanceService.getCastPerformances({
        castId: "123e4567-e89b-12d3-a456-426614174000",
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      expect(performances).toHaveLength(1);
      expect(performances[0].id).toBe("223e4567-e89b-12d3-a456-426614174001");
    });

    it("should handle service errors gracefully", async () => {
      // Setup mock chain for getCastById with error
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);

      // Mock service error
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Cast not found", code: "PGRST116" },
      });

      await expect(
        compensationService.calculateCastCompensation(
          "non-existent-cast",
          "2024-01-01",
          "2024-01-31"
        )
      ).rejects.toThrow("キャストが見つかりません");
    });
  });

  describe("Data Consistency", () => {
    it("should maintain data consistency across services", async () => {
      const castId = "123e4567-e89b-12d3-a456-426614174000";

      // Mock cast retrieval
      mockSupabase.single.mockResolvedValue({
        data: {
          id: castId,
          staff_id: "223e4567-e89b-12d3-a456-426614174001",
          stage_name: "テストキャスト",
          hourly_rate: 3000,
          back_percentage: 50,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      // Get cast from both direct service call and through compensation service
      const directCast = await castService.getCastById(castId);

      // Reset mock for compensation calculation
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: castId,
          staff_id: "223e4567-e89b-12d3-a456-426614174001",
          stage_name: "テストキャスト",
          hourly_rate: 3000,
          back_percentage: 50,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });

      mockSupabase.range.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const compensation = await compensationService.calculateCastCompensation(
        castId,
        "2024-01-01",
        "2024-01-31"
      );

      // Both should return the same cast data
      expect(directCast?.stageName).toBe(compensation.cast.stageName);
      expect(directCast?.hourlyRate).toBe(compensation.cast.hourlyRate);
      expect(directCast?.backPercentage).toBe(compensation.cast.backPercentage);
    });
  });

  describe("Performance Optimization", () => {
    it("should handle multiple service calls efficiently", async () => {
      const castIds = [
        "123e4567-e89b-12d3-a456-426614174001",
        "123e4567-e89b-12d3-a456-426614174002",
        "123e4567-e89b-12d3-a456-426614174003",
      ];

      // Mock casts fetch
      mockSupabase.in.mockReturnValueOnce({
        data: castIds.map((castId, index) => ({
          id: castId,
          staff_id: `223e4567-e89b-12d3-a456-42661417400${index + 1}`,
          stage_name: `キャスト${index + 1}`,
          hourly_rate: 3000,
          back_percentage: 50,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        })),
        error: null,
      });

      // Mock performances fetch
      mockSupabase.lte.mockReturnValueOnce({
        order: vi.fn().mockReturnValue({
          data: [],
          error: null,
        }),
      });

      const startTime = Date.now();
      const compensations =
        await compensationService.calculateMultipleCastsCompensation(
          castIds,
          "2024-01-01",
          "2024-01-31"
        );
      const endTime = Date.now();

      expect(compensations).toHaveLength(3);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
