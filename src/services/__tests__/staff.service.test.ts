import { describe, it, expect, beforeEach, vi } from "vitest";
import { StaffService } from "../staff.service";
import { createClient } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("StaffService", () => {
  let staffService: StaffService;
  let mockSupabaseClient: {
    from: ReturnType<typeof vi.fn>;
  };

  const mockDbMethods = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseClient = {
      from: vi.fn(() => mockDbMethods),
    };

    vi.mocked(createClient).mockReturnValue(
      mockSupabaseClient as unknown as ReturnType<typeof createClient>
    );

    staffService = new StaffService();
  });

  describe("createStaff", () => {
    it("should create a new staff member", async () => {
      const newStaff = {
        id: "staff-1",
        user_id: "user-1",
        full_name: "山田太郎",
        role: "manager" as const,
        hire_date: "2024-01-01",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockDbMethods.single.mockResolvedValue({ data: newStaff, error: null });

      const result = await staffService.createStaff({
        userId: "user-1",
        fullName: "山田太郎",
        role: "manager",
        hireDate: "2024-01-01",
      });

      expect(result).toEqual({
        id: "staff-1",
        userId: "user-1",
        fullName: "山田太郎",
        role: "manager",
        hireDate: "2024-01-01",
        isActive: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("staffs");
      expect(mockDbMethods.insert).toHaveBeenCalledWith({
        user_id: "user-1",
        full_name: "山田太郎",
        role: "manager",
        hire_date: "2024-01-01",
      });
    });

    it("should use current date if hire date not provided", async () => {
      const today = new Date().toISOString().split("T")[0];
      const newStaff = {
        id: "staff-1",
        user_id: "user-1",
        full_name: "山田太郎",
        role: "cast" as const,
        hire_date: today,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockDbMethods.single.mockResolvedValue({ data: newStaff, error: null });

      await staffService.createStaff({
        userId: "user-1",
        fullName: "山田太郎",
        role: "cast",
      });

      expect(mockDbMethods.insert).toHaveBeenCalledWith({
        user_id: "user-1",
        full_name: "山田太郎",
        role: "cast",
        hire_date: today,
      });
    });

    it("should throw error when creation fails", async () => {
      mockDbMethods.single.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      await expect(
        staffService.createStaff({
          userId: "user-1",
          fullName: "山田太郎",
          role: "manager",
        })
      ).rejects.toThrow("Failed to create staff: Database error");
    });
  });

  describe("getStaffById", () => {
    it("should return staff by ID", async () => {
      const mockStaff = {
        id: "staff-1",
        user_id: "user-1",
        full_name: "山田太郎",
        role: "manager" as const,
        hire_date: "2024-01-01",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockDbMethods.single.mockResolvedValue({ data: mockStaff, error: null });

      const result = await staffService.getStaffById("staff-1");

      expect(result).toEqual({
        id: "staff-1",
        userId: "user-1",
        fullName: "山田太郎",
        role: "manager",
        hireDate: "2024-01-01",
        isActive: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      expect(mockDbMethods.eq).toHaveBeenCalledWith("id", "staff-1");
    });

    it("should return null when staff not found", async () => {
      mockDbMethods.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await staffService.getStaffById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getAllStaff", () => {
    it("should return all staff members", async () => {
      const mockStaffList = [
        {
          id: "staff-1",
          user_id: "user-1",
          full_name: "山田太郎",
          role: "manager" as const,
          hire_date: "2024-01-01",
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "staff-2",
          user_id: "user-2",
          full_name: "鈴木花子",
          role: "cast" as const,
          hire_date: "2024-01-02",
          is_active: true,
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ];

      mockDbMethods.order.mockResolvedValue({
        data: mockStaffList,
        error: null,
      });

      const result = await staffService.getAllStaff();

      expect(result).toHaveLength(2);
      expect(result[0].fullName).toBe("山田太郎");
      expect(result[1].fullName).toBe("鈴木花子");
      expect(mockDbMethods.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });
  });

  describe("updateStaff", () => {
    it("should update staff information", async () => {
      const updatedStaff = {
        id: "staff-1",
        user_id: "user-1",
        full_name: "山田太郎（更新）",
        role: "admin" as const,
        hire_date: "2024-01-01",
        is_active: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-15T00:00:00Z",
      };

      mockDbMethods.single.mockResolvedValue({
        data: updatedStaff,
        error: null,
      });

      const result = await staffService.updateStaff("staff-1", {
        fullName: "山田太郎（更新）",
        role: "admin",
        isActive: false,
      });

      expect(result.fullName).toBe("山田太郎（更新）");
      expect(result.role).toBe("admin");
      expect(result.isActive).toBe(false);

      expect(mockDbMethods.update).toHaveBeenCalledWith({
        full_name: "山田太郎（更新）",
        role: "admin",
        is_active: false,
      });
      expect(mockDbMethods.eq).toHaveBeenCalledWith("id", "staff-1");
    });
  });

  describe("CastProfile operations", () => {
    describe("createCastProfile", () => {
      it("should create a new cast profile", async () => {
        const newProfile = {
          id: "cast-1",
          staff_id: "staff-1",
          stage_name: "まりあ",
          birthday: null,
          blood_type: null,
          height: null,
          three_size: null,
          hobby: null,
          special_skill: null,
          self_introduction: "よろしくお願いします",
          profile_image_url: "https://example.com/maria.jpg",
          hourly_rate: 3000,
          back_percentage: 50,
          is_active: true,
          created_by: null,
          updated_by: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        };

        mockDbMethods.single.mockResolvedValue({
          data: newProfile,
          error: null,
        });

        const result = await staffService.createCastProfile({
          staffId: "staff-1",
          nickname: "まりあ",
          profileImageUrl: "https://example.com/maria.jpg",
          bio: "よろしくお願いします",
          hourlyWage: 3000,
          commissionRate: { shimei: 50, bottlePercent: 10 },
        });

        expect(result).toEqual({
          staffId: "staff-1",
          nickname: "まりあ",
          profileImageUrl: "https://example.com/maria.jpg",
          bio: "よろしくお願いします",
          hourlyWage: 3000,
          commissionRate: { shimei: 50, bottlePercent: 50 }, // Both values come from back_percentage
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        });

        expect(mockSupabaseClient.from).toHaveBeenCalledWith("casts_profile");
      });
    });

    describe("getCastProfile", () => {
      it("should return cast profile by staff ID", async () => {
        const mockProfile = {
          id: "cast-1",
          staff_id: "staff-1",
          stage_name: "まりあ",
          birthday: null,
          blood_type: null,
          height: null,
          three_size: null,
          hobby: null,
          special_skill: null,
          self_introduction: null,
          profile_image_url: null,
          hourly_rate: 3000,
          back_percentage: 50,
          is_active: true,
          created_by: null,
          updated_by: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        };

        mockDbMethods.single.mockResolvedValue({
          data: mockProfile,
          error: null,
        });

        const result = await staffService.getCastProfile("staff-1");

        expect(result).toBeTruthy();
        expect(result?.nickname).toBe("まりあ");
        expect(result?.hourlyWage).toBe(3000);
        expect(result?.commissionRate).toEqual({
          shimei: 50,
          bottlePercent: 50,
        });
      });

      it("should return null when profile not found", async () => {
        mockDbMethods.single.mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        });

        const result = await staffService.getCastProfile("non-existent");

        expect(result).toBeNull();
      });
    });

    describe("updateCastProfile", () => {
      it("should update cast profile", async () => {
        const updatedProfile = {
          id: "cast-1",
          staff_id: "staff-1",
          stage_name: "まりあ（新）",
          birthday: null,
          blood_type: null,
          height: null,
          three_size: null,
          hobby: null,
          special_skill: null,
          self_introduction: "新しい自己紹介",
          profile_image_url: "https://example.com/maria-new.jpg",
          hourly_rate: 3500,
          back_percentage: 60,
          is_active: true,
          created_by: null,
          updated_by: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
        };

        mockDbMethods.single.mockResolvedValue({
          data: updatedProfile,
          error: null,
        });

        const result = await staffService.updateCastProfile("staff-1", {
          nickname: "まりあ（新）",
          profileImageUrl: "https://example.com/maria-new.jpg",
          bio: "新しい自己紹介",
          hourlyWage: 3500,
          commissionRate: { shimei: 60, bottlePercent: 15 },
        });

        expect(result.nickname).toBe("まりあ（新）");
        expect(result.hourlyWage).toBe(3500);
        expect(result.commissionRate).toEqual({
          shimei: 60,
          bottlePercent: 60, // Both values are set to back_percentage in the new schema
        });
      });
    });
  });
});
