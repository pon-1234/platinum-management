import { BaseService } from "./base.service";
import { camelToSnake, removeUndefined } from "@/lib/utils/transform";
import type { Database } from "@/types/database.types";
import type {
  Cast,
  CreateCastData,
  UpdateCastData,
  UpdateCastProfileData,
  CastSearchParams,
} from "@/types/cast.types";
import {
  createCastSchema,
  updateCastSchema,
  updateCastProfileSchema,
  castSearchSchema,
} from "@/lib/validations/cast";

/**
 * @design_doc See doc.md - Cast Profile Management
 * @related_to CastPerformanceService, CastCompensationService - separated responsibilities
 * @known_issues None currently known
 */
export class CastService extends BaseService {
  constructor() {
    super();
  }

  // Cast CRUD operations
  async createCast(data: CreateCastData): Promise<Cast> {
    // Validate input
    const validatedData = createCastSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId();

    const { data: cast, error } = await this.supabase
      .from("casts_profile")
      .insert({
        staff_id: validatedData.staffId,
        stage_name: validatedData.stageName,
        birthday: validatedData.birthday || null,
        blood_type: validatedData.bloodType || null,
        height: validatedData.height || null,
        three_size: validatedData.threeSize || null,
        hobby: validatedData.hobby || null,
        special_skill: validatedData.specialSkill || null,
        self_introduction: validatedData.selfIntroduction || null,
        profile_image_url: validatedData.profileImageUrl || null,
        hourly_rate: validatedData.hourlyRate,
        back_percentage: validatedData.backPercentage,
        is_active: validatedData.isActive ?? true,
        created_by: staffId,
        updated_by: staffId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "キャストの作成に失敗しました")
      );
    }

    return this.mapToCast(cast);
  }

  async getCastById(id: string): Promise<Cast | null> {
    const { data, error } = await this.supabase
      .from("casts_profile")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(
        this.handleDatabaseError(error, "キャスト情報の取得に失敗しました")
      );
    }

    return this.mapToCast(data);
  }

  async getCastByStaffId(staffId: string): Promise<Cast | null> {
    const { data, error } = await this.supabase
      .from("casts_profile")
      .select("*")
      .eq("staff_id", staffId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(
        this.handleDatabaseError(error, "キャスト情報の取得に失敗しました")
      );
    }

    return this.mapToCast(data);
  }

  async updateCast(id: string, data: UpdateCastData): Promise<Cast> {
    // Validate input
    const validatedData = updateCastSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId();

    const transformedData = removeUndefined(camelToSnake(validatedData));
    const updateData: Record<string, unknown> = {
      ...transformedData,
      updated_by: staffId,
    };

    const { data: cast, error } = await this.supabase
      .from("casts_profile")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "キャスト情報の更新に失敗しました")
      );
    }

    return this.mapToCast(cast);
  }

  async updateCastProfile(
    staffId: string,
    data: UpdateCastProfileData
  ): Promise<Cast> {
    // Validate input
    const validatedData = updateCastProfileSchema.parse(data);

    const transformedData = removeUndefined(camelToSnake(validatedData));
    const updateData: Record<string, unknown> = {
      ...transformedData,
    };

    const { data: cast, error } = await this.supabase
      .from("casts_profile")
      .update(updateData)
      .eq("staff_id", staffId)
      .select()
      .single();

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "プロフィールの更新に失敗しました")
      );
    }

    return this.mapToCast(cast);
  }

  // Alias method for easier usage
  async getCasts(params: CastSearchParams = {}): Promise<Cast[]> {
    return this.searchCasts(params);
  }

  async getAllCasts(): Promise<Cast[]> {
    const { data, error } = await this.supabase
      .from("casts_profile")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "全キャスト情報の取得に失敗しました")
      );
    }

    return data.map(this.mapToCast);
  }

  async searchCasts(params: CastSearchParams = {}): Promise<Cast[]> {
    // Validate search parameters
    const validatedParams = castSearchSchema.parse(params);

    let query = this.supabase
      .from("casts_profile")
      .select("*")
      .order("created_at", { ascending: false });

    // Add search query if provided
    if (validatedParams.query) {
      query = query.ilike("stage_name", `%${validatedParams.query}%`);
    }

    // Filter by active status if provided
    if (validatedParams.isActive !== undefined) {
      query = query.eq("is_active", validatedParams.isActive);
    }

    // Apply pagination
    query = query.range(
      validatedParams.offset,
      validatedParams.offset + validatedParams.limit - 1
    );

    const { data, error } = await query;

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "キャスト検索に失敗しました")
      );
    }

    return data.map(this.mapToCast);
  }

  // Delete cast
  async deleteCast(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("casts_profile")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "キャストの削除に失敗しました")
      );
    }
  }

  // Helper methods

  private mapToCast(
    data: Database["public"]["Tables"]["casts_profile"]["Row"]
  ): Cast {
    return {
      id: data.id,
      staffId: data.staff_id,
      stageName: data.stage_name,
      birthday: data.birthday || null,
      bloodType: data.blood_type || null,
      height: data.height || null,
      threeSize: data.three_size || null,
      hobby: data.hobby || null,
      specialSkill: data.special_skill || null,
      selfIntroduction: data.self_introduction || null,
      profileImageUrl: data.profile_image_url || null,
      hourlyRate: data.hourly_rate,
      backPercentage: data.back_percentage,
      memo: null,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// Export singleton instance
export const castService = new CastService();
