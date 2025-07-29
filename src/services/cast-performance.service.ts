import { BaseService } from "./base.service";
import { createClient } from "@/lib/supabase/client";
import { camelToSnake, removeUndefined } from "@/lib/utils/transform";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  CastPerformance,
  CreateCastPerformanceData,
  UpdateCastPerformanceData,
  CastPerformanceSearchParams,
  CastRanking,
} from "@/types/cast.types";
import {
  createCastPerformanceSchema,
  updateCastPerformanceSchema,
  castPerformanceSearchSchema,
} from "@/lib/validations/cast";

/**
 * @design_doc See doc.md - Cast Performance Management
 * @related_to CastService, CastCompensationService - separated responsibilities
 * @known_issues None currently known
 */
export class CastPerformanceService extends BaseService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    super();
    this.supabase = createClient();
  }

  async createCastPerformance(
    data: CreateCastPerformanceData
  ): Promise<CastPerformance> {
    const validatedData = createCastPerformanceSchema.parse(data);
    const staffId = await this.getCurrentStaffId(this.supabase);

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
      throw new Error(
        this.handleDatabaseError(error, "成績の記録に失敗しました")
      );
    }

    return this.mapToCastPerformance(performance);
  }

  async updateCastPerformance(
    id: string,
    data: UpdateCastPerformanceData
  ): Promise<CastPerformance> {
    const validatedData = updateCastPerformanceSchema.parse(data);
    const staffId = await this.getCurrentStaffId(this.supabase);

    const transformedData = removeUndefined(camelToSnake(validatedData));
    const updateData: Record<string, unknown> = {
      ...transformedData,
      updated_by: staffId,
    };

    const { data: performance, error } = await this.supabase
      .from("cast_performances")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "成績の更新に失敗しました")
      );
    }

    return this.mapToCastPerformance(performance);
  }

  async getCastPerformances(
    params: CastPerformanceSearchParams = {}
  ): Promise<CastPerformance[]> {
    const validatedParams = castPerformanceSearchSchema.parse(params);

    let query = this.supabase
      .from("cast_performances")
      .select("*")
      .order("date", { ascending: false });

    if (validatedParams.castId) {
      query = query.eq("cast_id", validatedParams.castId);
    }

    if (validatedParams.startDate) {
      query = query.gte("date", validatedParams.startDate);
    }
    if (validatedParams.endDate) {
      query = query.lte("date", validatedParams.endDate);
    }

    query = query.range(
      validatedParams.offset,
      validatedParams.offset + validatedParams.limit - 1
    );

    const { data, error } = await query;

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "成績の取得に失敗しました")
      );
    }

    return data.map((item) => this.mapToCastPerformance(item));
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
      throw new Error(
        this.handleDatabaseError(error, "ランキングの取得に失敗しました")
      );
    }

    return data || [];
  }

  public mapToCastPerformance(
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

export const castPerformanceService = new CastPerformanceService();
