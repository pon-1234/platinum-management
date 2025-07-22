import { describe, it, expect, vi, beforeEach } from "vitest";
import { CastService } from "../cast.service";
import { createClient } from "@/lib/supabase/client";
import type { CreateCastData, UpdateCastProfileData } from "@/types/cast.types";

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
        "既に同じデータが存在します"
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
});
