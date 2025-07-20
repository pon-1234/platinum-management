import { BaseService } from "./base.service";
import { camelToSnake, removeUndefined } from "@/lib/utils/transform";
import type { Database } from "@/types/database.types";
import type {
  Cast,
  CastPerformance,
  CreateCastData,
  UpdateCastData,
  UpdateCastProfileData,
  CreateCastPerformanceData,
  UpdateCastPerformanceData,
  CastSearchParams,
  CastPerformanceSearchParams,
  CastRanking,
  CastCompensation,
} from "@/types/cast.types";
import {
  createCastSchema,
  updateCastSchema,
  updateCastProfileSchema,
  createCastPerformanceSchema,
  updateCastPerformanceSchema,
  castSearchSchema,
  castPerformanceSearchSchema,
} from "@/lib/validations/cast";

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
      if (error.code === "23505") {
        throw new Error("このスタッフIDは既にキャストとして登録されています");
      }
      throw new Error(`キャストの作成に失敗しました: ${error.message}`);
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
      throw new Error(`キャスト情報の取得に失敗しました: ${error.message}`);
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
      throw new Error(`キャスト情報の取得に失敗しました: ${error.message}`);
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
      updated_at: new Date().toISOString(),
    };

    const { data: cast, error } = await this.supabase
      .from("casts_profile")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`キャスト情報の更新に失敗しました: ${error.message}`);
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
      updated_at: new Date().toISOString(),
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
      throw new Error(`キャスト検索に失敗しました: ${error.message}`);
    }

    return data.map(this.mapToCast);
  }

  // Cast performance operations
  async createCastPerformance(
    data: CreateCastPerformanceData
  ): Promise<CastPerformance> {
    // Validate input
    const validatedData = createCastPerformanceSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId();

    const { data: performance, error } = await this.supabase
      .from("cast_performances")
      .insert({
        cast_id: validatedData.castId,
        date: validatedData.date,
        shimei_count: validatedData.shimeiCount,
        dohan_count: validatedData.dohanCount,
        sales_amount: validatedData.salesAmount,
        drink_count: validatedData.drinkCount,
        created_by: staffId,
        updated_by: staffId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("この日付の成績は既に登録されています");
      }
      throw new Error(`成績の記録に失敗しました: ${error.message}`);
    }

    return this.mapToCastPerformance(performance);
  }

  async updateCastPerformance(
    id: string,
    data: UpdateCastPerformanceData
  ): Promise<CastPerformance> {
    // Validate input
    const validatedData = updateCastPerformanceSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, unknown> = {
      ...validatedData,
      updated_by: staffId,
      updated_at: new Date().toISOString(),
    };

    // Map camelCase to snake_case
    if (validatedData.shimeiCount !== undefined)
      updateData.shimei_count = validatedData.shimeiCount;
    if (validatedData.dohanCount !== undefined)
      updateData.dohan_count = validatedData.dohanCount;
    if (validatedData.salesAmount !== undefined)
      updateData.sales_amount = validatedData.salesAmount;
    if (validatedData.drinkCount !== undefined)
      updateData.drink_count = validatedData.drinkCount;

    // Remove camelCase properties
    delete updateData.shimeiCount;
    delete updateData.dohanCount;
    delete updateData.salesAmount;
    delete updateData.drinkCount;

    const { data: performance, error } = await this.supabase
      .from("cast_performances")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`成績の更新に失敗しました: ${error.message}`);
    }

    return this.mapToCastPerformance(performance);
  }

  async getCastPerformances(
    params: CastPerformanceSearchParams = {}
  ): Promise<CastPerformance[]> {
    // Validate search parameters
    const validatedParams = castPerformanceSearchSchema.parse(params);

    let query = this.supabase
      .from("cast_performances")
      .select("*")
      .order("date", { ascending: false });

    // Filter by cast ID if provided
    if (validatedParams.castId) {
      query = query.eq("cast_id", validatedParams.castId);
    }

    // Filter by date range
    if (validatedParams.startDate) {
      query = query.gte("date", validatedParams.startDate);
    }
    if (validatedParams.endDate) {
      query = query.lte("date", validatedParams.endDate);
    }

    // Apply pagination
    query = query.range(
      validatedParams.offset,
      validatedParams.offset + validatedParams.limit - 1
    );

    const { data, error } = await query;

    if (error) {
      throw new Error(`成績の取得に失敗しました: ${error.message}`);
    }

    return data.map(this.mapToCastPerformance);
  }

  async getCastRanking(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<CastRanking[]> {
    const { data, error } = await this.supabase.rpc("get_cast_ranking", {
      start_date: startDate,
      end_date: endDate,
      limit_count: limit,
    });

    if (error) {
      throw new Error(`ランキングの取得に失敗しました: ${error.message}`);
    }

    return data || [];
  }

  async calculateCastCompensation(
    castId: string,
    startDate: string,
    endDate: string
  ): Promise<CastCompensation> {
    // Get cast information
    const cast = await this.getCastById(castId);
    if (!cast) {
      throw new Error("キャストが見つかりません");
    }

    // Get performances in the period
    const performances = await this.getCastPerformances({
      castId,
      startDate,
      endDate,
    });

    // Calculate work hours (this would need attendance data in real implementation)
    // For now, we'll estimate based on the number of days with performances
    const workDays = new Set(performances.map((p) => p.date)).size;
    const averageHoursPerDay = 6; // Placeholder
    const workHours = workDays * averageHoursPerDay;

    // Calculate hourly wage
    const hourlyWage = cast.hourlyRate * workHours;

    // Calculate back amount
    const totalSales = performances.reduce((sum, p) => sum + p.salesAmount, 0);
    const backAmount = (totalSales * cast.backPercentage) / 100;

    // Total compensation
    const totalAmount = hourlyWage + backAmount;

    return {
      castId,
      cast,
      period: `${startDate} - ${endDate}`,
      hourlyWage,
      backAmount,
      totalAmount,
      workHours,
      performances,
    };
  }

  // Batch calculate compensation for multiple casts
  async calculateMultipleCastsCompensation(
    castIds: string[],
    startDate: string,
    endDate: string
  ): Promise<(CastCompensation & { castName: string })[]> {
    const compensations = await Promise.all(
      castIds.map(async (castId) => {
        const compensation = await this.calculateCastCompensation(
          castId,
          startDate,
          endDate
        );

        // Get cast name
        const { data: cast } = await this.supabase
          .from("casts_profile")
          .select("nickname, staffs!inner(full_name)")
          .eq("staff_id", castId)
          .single();

        const castName = cast?.nickname || cast?.staffs?.full_name || "Unknown";

        return {
          ...compensation,
          castName,
        };
      })
    );

    return compensations;
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
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToCastPerformance(
    data: Database["public"]["Tables"]["cast_performances"]["Row"]
  ): CastPerformance {
    return {
      id: data.id,
      castId: data.cast_id,
      date: data.date,
      shimeiCount: data.shimei_count,
      dohanCount: data.dohan_count,
      salesAmount: data.sales_amount,
      drinkCount: data.drink_count,
      createdBy: data.created_by || null,
      updatedBy: data.updated_by || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
