import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface NominationType {
  id: string;
  type_name: string;
  display_name: string;
  price: number;
  back_rate: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNominationTypeInput {
  type_name: string;
  display_name: string;
  price: number;
  back_rate: number;
  priority?: number;
  is_active?: boolean;
}

export interface UpdateNominationTypeInput {
  display_name?: string;
  price?: number;
  back_rate?: number;
  priority?: number;
  is_active?: boolean;
}

export class NominationTypeService {
  /**
   * 全ての指名種別を取得
   */
  static async getAllNominationTypes(
    includeInactive = false
  ): Promise<NominationType[]> {
    let query = supabase
      .from("nomination_types")
      .select("*")
      .order("priority", { ascending: true })
      .order("display_name", { ascending: true });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching nomination types:", error);
      throw new Error("指名種別の取得に失敗しました");
    }

    return data || [];
  }

  /**
   * 指名種別をIDで取得
   */
  static async getNominationTypeById(
    id: string
  ): Promise<NominationType | null> {
    const { data, error } = await supabase
      .from("nomination_types")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      console.error("Error fetching nomination type:", error);
      throw new Error("指名種別の取得に失敗しました");
    }

    return data;
  }

  /**
   * 指名種別を種別名で取得
   */
  static async getNominationTypeByName(
    typeName: string
  ): Promise<NominationType | null> {
    const { data, error } = await supabase
      .from("nomination_types")
      .select("*")
      .eq("type_name", typeName)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      console.error("Error fetching nomination type by name:", error);
      throw new Error("指名種別の取得に失敗しました");
    }

    return data;
  }

  /**
   * 新しい指名種別を作成
   */
  static async createNominationType(
    input: CreateNominationTypeInput
  ): Promise<NominationType> {
    const { data, error } = await supabase
      .from("nomination_types")
      .insert({
        type_name: input.type_name,
        display_name: input.display_name,
        price: input.price,
        back_rate: input.back_rate,
        priority: input.priority || 999,
        is_active: input.is_active !== undefined ? input.is_active : true,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating nomination type:", error);
      if (error.code === "23505") {
        throw new Error("この種別名は既に使用されています");
      }
      throw new Error("指名種別の作成に失敗しました");
    }

    return data;
  }

  /**
   * 指名種別を更新
   */
  static async updateNominationType(
    id: string,
    input: UpdateNominationTypeInput
  ): Promise<NominationType> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.display_name !== undefined)
      updateData.display_name = input.display_name;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.back_rate !== undefined) updateData.back_rate = input.back_rate;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from("nomination_types")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Error updating nomination type:", error);
      throw new Error("指名種別の更新に失敗しました");
    }

    return data;
  }

  /**
   * 指名種別を削除（論理削除）
   */
  static async deleteNominationType(id: string): Promise<void> {
    // 実際には is_active を false にする論理削除
    const { error } = await supabase
      .from("nomination_types")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error deleting nomination type:", error);
      throw new Error("指名種別の削除に失敗しました");
    }
  }

  /**
   * 指名種別の表示順序を更新
   */
  static async updatePriorities(
    priorities: Array<{ id: string; priority: number }>
  ): Promise<void> {
    const promises = priorities.map(({ id, priority }) =>
      supabase
        .from("nomination_types")
        .update({
          priority,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
    );

    const results = await Promise.all(promises);
    const hasError = results.some((result) => result.error);

    if (hasError) {
      console.error("Error updating priorities:", results);
      throw new Error("表示順序の更新に失敗しました");
    }
  }

  /**
   * デフォルトの指名種別を取得（本指名）
   */
  static async getDefaultNominationType(): Promise<NominationType | null> {
    return this.getNominationTypeByName("main_nomination");
  }

  /**
   * 指名料金の合計を計算
   */
  static async calculateTotalNominationFee(
    nominationTypeIds: string[]
  ): Promise<number> {
    if (nominationTypeIds.length === 0) return 0;

    const { data, error } = await supabase
      .from("nomination_types")
      .select("price")
      .in("id", nominationTypeIds)
      .eq("is_active", true);

    if (error) {
      console.error("Error calculating total fee:", error);
      throw new Error("指名料金の計算に失敗しました");
    }

    return (data || []).reduce((sum, item) => sum + item.price, 0);
  }

  /**
   * 指名種別の統計情報を取得
   */
  static async getNominationTypeStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      nomination_type: NominationType;
      count: number;
      total_revenue: number;
      total_back: number;
    }>
  > {
    const { data, error } = await supabase
      .from("visit_cast_assignments")
      .select(
        `
        nomination_type_id,
        nomination_types!inner(*)
      `
      )
      .gte("assigned_at", startDate.toISOString())
      .lte("assigned_at", endDate.toISOString());

    if (error) {
      console.error("Error fetching statistics:", error);
      throw new Error("統計情報の取得に失敗しました");
    }

    // データを集計
    const stats = new Map<
      string,
      {
        nomination_type: NominationType;
        count: number;
        total_revenue: number;
        total_back: number;
      }
    >();

    (data || []).forEach((item) => {
      const typeId = item.nomination_type_id;
      const nominationType = item.nomination_types;

      if (!stats.has(typeId)) {
        stats.set(typeId, {
          nomination_type: nominationType,
          count: 0,
          total_revenue: 0,
          total_back: 0,
        });
      }

      const stat = stats.get(typeId);
      stat.count += 1;
      stat.total_revenue += nominationType.price;
      stat.total_back +=
        (nominationType.price * nominationType.back_rate) / 100;
    });

    return Array.from(stats.values());
  }
}
