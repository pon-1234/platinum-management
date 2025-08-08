import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

import type {
  VisitCastAssignment,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "@/types/cast-assignment.types";

// 型の再エクスポート（既存のインポートとの互換性維持）
export type { VisitCastAssignment };

export class CastAssignmentService {
  /**
   * 来店にキャストを割り当てる
   */
  static async assignCastToVisit(
    input: CreateAssignmentInput
  ): Promise<VisitCastAssignment> {
    const { data, error } = await supabase
      .from("visit_cast_assignments")
      .insert({
        visit_id: input.visit_id,
        cast_id: input.cast_id,
        nomination_type_id: input.nomination_type_id,
        is_primary: input.is_primary || false,
        notes: input.notes,
        assigned_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        nomination_type:nomination_types(*),
        cast:casts_profile(id, name, staff_code)
      `
      )
      .single();

    if (error) {
      console.error("Error assigning cast to visit:", error);
      throw new Error("キャストの割り当てに失敗しました");
    }

    return data;
  }

  /**
   * 来店のキャスト割り当て一覧を取得
   */
  static async getVisitAssignments(
    visitId: string
  ): Promise<VisitCastAssignment[]> {
    const { data, error } = await supabase
      .from("visit_cast_assignments")
      .select(
        `
        *,
        nomination_type:nomination_types(*),
        cast:casts_profile(id, name, staff_code)
      `
      )
      .eq("visit_id", visitId)
      .order("is_primary", { ascending: false })
      .order("assigned_at", { ascending: true });

    if (error) {
      console.error("Error fetching visit assignments:", error);
      throw new Error("キャスト割り当ての取得に失敗しました");
    }

    return data || [];
  }

  /**
   * キャストの割り当てを更新
   */
  static async updateAssignment(
    assignmentId: string,
    input: UpdateAssignmentInput
  ): Promise<VisitCastAssignment> {
    const { data, error } = await supabase
      .from("visit_cast_assignments")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignmentId)
      .select(
        `
        *,
        nomination_type:nomination_types(*),
        cast:casts_profile(id, name, staff_code)
      `
      )
      .single();

    if (error) {
      console.error("Error updating assignment:", error);
      throw new Error("キャスト割り当ての更新に失敗しました");
    }

    return data;
  }

  /**
   * キャストの割り当てを終了
   */
  static async endAssignment(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from("visit_cast_assignments")
      .update({
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignmentId);

    if (error) {
      console.error("Error ending assignment:", error);
      throw new Error("キャスト割り当ての終了に失敗しました");
    }
  }

  /**
   * キャストの割り当てを削除
   */
  static async removeAssignment(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from("visit_cast_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      console.error("Error removing assignment:", error);
      throw new Error("キャスト割り当ての削除に失敗しました");
    }
  }

  /**
   * メインキャストを設定
   */
  static async setPrimaryCast(visitId: string, castId: string): Promise<void> {
    // まず、既存のメインキャストを解除
    await supabase
      .from("visit_cast_assignments")
      .update({
        is_primary: false,
        updated_at: new Date().toISOString(),
      })
      .eq("visit_id", visitId)
      .eq("is_primary", true);

    // 指定されたキャストをメインに設定
    const { error } = await supabase
      .from("visit_cast_assignments")
      .update({
        is_primary: true,
        updated_at: new Date().toISOString(),
      })
      .eq("visit_id", visitId)
      .eq("cast_id", castId);

    if (error) {
      console.error("Error setting primary cast:", error);
      throw new Error("メインキャストの設定に失敗しました");
    }
  }

  /**
   * 来店の指名料合計を計算
   */
  static async calculateNominationFees(visitId: string): Promise<{
    total: number;
    details: Array<{
      cast_id: string;
      cast_name: string;
      nomination_type: string;
      fee: number;
    }>;
  }> {
    const { data, error } = await supabase.rpc("calculate_nomination_fees", {
      p_visit_id: visitId,
    });

    if (error) {
      console.error("Error calculating nomination fees:", error);
      throw new Error("指名料の計算に失敗しました");
    }

    return {
      total: data?.[0]?.total_nomination_fee || 0,
      details: data?.[0]?.details || [],
    };
  }

  /**
   * キャストの指名バックを計算
   */
  static async calculateCastNominationBack(
    castId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalBack: number;
    nominationCount: number;
    details: Array<{
      visit_id: string;
      visit_date: string;
      nomination_type: string;
      nomination_fee: number;
      back_rate: number;
      back_amount: number;
    }>;
  }> {
    const { data, error } = await supabase.rpc(
      "calculate_cast_nomination_back",
      {
        p_cast_id: castId,
        p_start_date: startDate.toISOString().split("T")[0],
        p_end_date: endDate.toISOString().split("T")[0],
      }
    );

    if (error) {
      console.error("Error calculating cast nomination back:", error);
      throw new Error("指名バックの計算に失敗しました");
    }

    return {
      totalBack: data?.[0]?.total_back_amount || 0,
      nominationCount: data?.[0]?.nomination_count || 0,
      details: data?.[0]?.details || [],
    };
  }

  /**
   * アクティブなキャスト一覧を取得（割り当て用）
   */
  static async getAvailableCasts(): Promise<
    Array<{
      id: string;
      name: string;
      staff_code?: string;
      is_working: boolean;
    }>
  > {
    const { data, error } = await supabase
      .from("casts_profile")
      .select("id, name, staff_code, is_working")
      .eq("employment_status", "active")
      .order("name");

    if (error) {
      console.error("Error fetching available casts:", error);
      throw new Error("キャスト一覧の取得に失敗しました");
    }

    return data || [];
  }
}
