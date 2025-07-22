import { describe, it, expect, vi, beforeEach } from "vitest";
import { CastCompensationService } from "../cast-compensation.service";
import { CastService } from "../cast.service";
import { CastPerformanceService } from "../cast-performance.service";
import type { Cast, CastPerformance } from "@/types/cast.types";

vi.mock("../cast.service");
vi.mock("../cast-performance.service");

describe("CastCompensationService", () => {
  let compensationService: CastCompensationService;
  let mockCastService: {
    getCastById: ReturnType<typeof vi.fn>;
  };
  let mockPerformanceService: {
    getCastPerformances: ReturnType<typeof vi.fn>;
  };

  const mockCast: Cast = {
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
    memo: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const mockPerformances: CastPerformance[] = [
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
  ];

  beforeEach(() => {
    mockCastService = {
      getCastById: vi.fn(),
    };
    mockPerformanceService = {
      getCastPerformances: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CastService as any).mockImplementation(() => mockCastService);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CastPerformanceService as any).mockImplementation(
      () => mockPerformanceService
    );

    compensationService = new CastCompensationService();
  });

  describe("calculateCastCompensation", () => {
    it("should calculate cast compensation correctly", async () => {
      mockCastService.getCastById.mockResolvedValue(mockCast);
      mockPerformanceService.getCastPerformances.mockResolvedValue(
        mockPerformances
      );

      const result = await compensationService.calculateCastCompensation(
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

    it("should handle cast not found", async () => {
      mockCastService.getCastById.mockResolvedValue(null);

      await expect(
        compensationService.calculateCastCompensation(
          "non-existent-cast",
          "2024-01-01",
          "2024-01-31"
        )
      ).rejects.toThrow("キャストが見つかりません");
    });

    it("should handle missing performance data", async () => {
      mockCastService.getCastById.mockResolvedValue(mockCast);
      mockPerformanceService.getCastPerformances.mockResolvedValue([]);

      const result = await compensationService.calculateCastCompensation(
        "223e4567-e89b-12d3-a456-426614174001",
        "2024-01-01",
        "2024-01-31"
      );

      expect(result.workHours).toBe(0);
      expect(result.hourlyWage).toBe(0);
      expect(result.backAmount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });

  describe("calculateMultipleCastsCompensation", () => {
    it("should calculate compensation for multiple casts", async () => {
      const castIds = ["cast-1", "cast-2"];

      // Mock the compensation calculations
      vi.spyOn(compensationService, "calculateCastCompensation")
        .mockResolvedValueOnce({
          castId: "cast-1",
          cast: { ...mockCast, id: "cast-1", stageName: "Alice" },
          period: "2024-01-01 - 2024-01-31",
          hourlyWage: 30000,
          backAmount: 50000,
          totalAmount: 80000,
          workHours: 10,
          performances: [],
        })
        .mockResolvedValueOnce({
          castId: "cast-2",
          cast: { ...mockCast, id: "cast-2", stageName: "Bob" },
          period: "2024-01-01 - 2024-01-31",
          hourlyWage: 25000,
          backAmount: 40000,
          totalAmount: 65000,
          workHours: 8,
          performances: [],
        });

      const result =
        await compensationService.calculateMultipleCastsCompensation(
          castIds,
          "2024-01-01",
          "2024-01-31"
        );

      expect(result).toHaveLength(2);
      expect(result[0].castId).toBe("cast-1");
      expect(result[0].totalAmount).toBe(80000);
      expect(result[1].castId).toBe("cast-2");
      expect(result[1].totalAmount).toBe(65000);
    });
  });
});
