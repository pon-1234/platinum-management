import { BaseService } from "./base.service";
import type { Database } from "@/types/database.types";
import type {
  Staff,
  CastProfile,
  CreateStaffData,
  UpdateStaffData,
  CreateCastProfileData,
  UpdateCastProfileData,
} from "@/types/staff.types";
import type { UserRole } from "@/types/auth.types";

export class StaffService extends BaseService {
  constructor() {
    super();
  }

  async createStaff(data: CreateStaffData): Promise<Staff> {
    const { data: staff, error } = await this.supabase
      .from("staffs")
      .insert(
        this.toSnakeCase({
          userId: data.userId,
          fullName: data.fullName,
          role: data.role,
          hireDate: data.hireDate || new Date().toISOString().split("T")[0],
        })
      )
      .select()
      .single();

    if (error) {
      this.handleError(error, "スタッフの作成に失敗しました");
    }

    return this.mapToStaff(staff);
  }

  async getStaffById(id: string): Promise<Staff | null> {
    const { data, error } = await this.supabase
      .from("staffs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      this.handleError(error, "スタッフの取得に失敗しました");
    }

    return this.mapToStaff(data);
  }

  async getStaffByUserId(userId: string): Promise<Staff | null> {
    const { data, error } = await this.supabase
      .from("staffs")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      this.handleError(error, "ユーザーIDでスタッフの取得に失敗しました");
    }

    return this.mapToStaff(data);
  }

  async getAllStaff(
    page: number = 1,
    limit: number = 20,
    searchQuery?: string,
    roleFilter?: string
  ): Promise<{ data: Staff[]; totalCount: number; hasMore: boolean }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with filters
    let countQuery = this.supabase
      .from("staffs")
      .select("*", { count: "exact", head: true });
    let dataQuery = this.supabase.from("staffs").select("*");

    // Apply search filter
    if (searchQuery) {
      countQuery = countQuery.ilike("full_name", `%${searchQuery}%`);
      dataQuery = dataQuery.ilike("full_name", `%${searchQuery}%`);
    }

    // Apply role filter
    if (roleFilter) {
      countQuery = countQuery.eq("role", roleFilter);
      dataQuery = dataQuery.eq("role", roleFilter);
    }

    // Get total count
    const { count, error: countError } = await countQuery;

    if (countError) {
      this.handleError(countError, "スタッフ数の取得に失敗しました");
    }

    // Get paginated data
    const { data, error } = await dataQuery
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      this.handleError(error, "スタッフ一覧の取得に失敗しました");
    }

    const staffList = data.map((item) => this.mapToStaff(item));
    const totalCount = count || 0;
    const hasMore = to < totalCount - 1;

    return { data: staffList, totalCount, hasMore };
  }

  async updateStaff(id: string, data: UpdateStaffData): Promise<Staff> {
    const { data: staff, error } = await this.supabase
      .from("staffs")
      .update(
        this.toSnakeCase({
          fullName: data.fullName,
          role: data.role,
          isActive: data.isActive,
        })
      )
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.handleError(error, "スタッフの更新に失敗しました");
    }

    return this.mapToStaff(staff);
  }

  async deleteStaff(id: string): Promise<void> {
    const { error } = await this.supabase.from("staffs").delete().eq("id", id);

    if (error) {
      this.handleError(error, "スタッフの削除に失敗しました");
    }
  }

  async getAvailableStaffForCast(): Promise<Staff[]> {
    // Get all staff that are not already casts and not admin
    const { data: staffs, error } = await this.supabase
      .from("staffs")
      .select("*")
      .neq("role", "admin")
      .eq("status", "active")
      .order("full_name_kana");

    if (error) {
      this.handleError(error, "スタッフ情報の取得に失敗しました");
    }

    // Get all existing cast staff IDs
    const { data: casts } = await this.supabase
      .from("casts_profile")
      .select("staff_id");

    const castStaffIds = new Set(casts?.map((c) => c.staff_id) || []);

    // Filter out staff that are already casts
    const availableStaff =
      staffs?.filter((staff) => !castStaffIds.has(staff.id)) || [];

    return availableStaff.map((staff) => this.mapToStaff(staff));
  }

  async getUnregisteredStaff(
    page: number = 1,
    limit: number = 20,
    searchQuery?: string
  ): Promise<{ data: Staff[]; totalCount: number; hasMore: boolean }> {
    const { data, error } = await this.supabase.rpc("get_unregistered_staff", {
      p_page: page,
      p_limit: limit,
      p_search_query: searchQuery || null,
    });

    if (error) {
      this.handleError(error, "未登録スタッフの取得に失敗しました");
    }

    if (!data || data.length === 0) {
      return { data: [], totalCount: 0, hasMore: false };
    }

    // Extract total count and hasMore from the first row
    const totalCount = data[0].total_count || 0;
    const hasMore = data[0].has_more || false;

    // Map the data to Staff type
    const staffList = data.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      userId: item.user_id as string,
      fullName: item.full_name as string,
      fullNameKana: item.full_name_kana as string | undefined,
      role: item.role as string,
      hireDate: item.hire_date as string,
      isActive: item.is_active as boolean,
      status: item.status as string,
      createdAt: item.created_at as string,
      updatedAt: item.updated_at as string,
    }));

    return { data: staffList, totalCount, hasMore };
  }

  async createCastProfile(data: CreateCastProfileData): Promise<CastProfile> {
    const { data: profile, error } = await this.supabase
      .from("casts_profile")
      .insert({
        staff_id: data.staffId,
        stage_name: data.nickname,
        profile_image_url: data.profileImageUrl || null,
        self_introduction: data.bio || null,
        hourly_rate: data.hourlyWage || 0,
        back_percentage: data.commissionRate?.shimei || 0,
      })
      .select()
      .single();

    if (error) {
      this.handleError(error, "キャストプロフィールの作成に失敗しました");
    }

    return this.mapToCastProfile(profile);
  }

  async getCastProfile(staffId: string): Promise<CastProfile | null> {
    const { data, error } = await this.supabase
      .from("casts_profile")
      .select("*")
      .eq("staff_id", staffId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      this.handleError(error, "キャストプロフィールの取得に失敗しました");
    }

    return this.mapToCastProfile(data);
  }

  async getAllCastProfiles(
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: CastProfile[]; totalCount: number; hasMore: boolean }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get total count
    const { count, error: countError } = await this.supabase
      .from("casts_profile")
      .select("*", { count: "exact", head: true });

    if (countError) {
      this.handleError(
        countError,
        "キャストプロフィール数の取得に失敗しました"
      );
    }

    // Get paginated data
    const { data, error } = await this.supabase
      .from("casts_profile")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      this.handleError(error, "キャストプロフィール一覧の取得に失敗しました");
    }

    const profileList = data.map((item) => this.mapToCastProfile(item));
    const totalCount = count || 0;
    const hasMore = to < totalCount - 1;

    return { data: profileList, totalCount, hasMore };
  }

  async updateCastProfile(
    staffId: string,
    data: UpdateCastProfileData
  ): Promise<CastProfile> {
    const updateData: Record<string, unknown> = {};

    if (data.nickname !== undefined) updateData.stage_name = data.nickname;
    if (data.profileImageUrl !== undefined)
      updateData.profile_image_url = data.profileImageUrl;
    if (data.bio !== undefined) updateData.self_introduction = data.bio;
    if (data.hourlyWage !== undefined) updateData.hourly_rate = data.hourlyWage;
    if (data.commissionRate !== undefined)
      updateData.back_percentage = data.commissionRate.shimei;

    const { data: profile, error } = await this.supabase
      .from("casts_profile")
      .update(updateData)
      .eq("staff_id", staffId)
      .select()
      .single();

    if (error) {
      this.handleError(error, "キャストプロフィールの更新に失敗しました");
    }

    return this.mapToCastProfile(profile);
  }

  private mapToStaff = (
    data: Database["public"]["Tables"]["staffs"]["Row"] & {
      full_name_kana?: string;
      status?: string;
    }
  ): Staff => {
    return {
      id: data.id,
      userId: data.user_id,
      fullName: data.full_name,
      fullNameKana: data.full_name_kana,
      role: data.role as UserRole,
      hireDate: data.hire_date,
      isActive: data.is_active,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  };

  private mapToCastProfile = (
    data: Database["public"]["Tables"]["casts_profile"]["Row"]
  ): CastProfile => {
    return {
      staffId: data.staff_id,
      nickname: data.stage_name,
      profileImageUrl: data.profile_image_url,
      bio: data.self_introduction,
      hourlyWage: data.hourly_rate,
      commissionRate: {
        shimei: data.back_percentage,
        bottlePercent: data.back_percentage,
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  };
}

// Export singleton instance
export const staffService = new StaffService();
