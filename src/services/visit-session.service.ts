import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

const supabase = createClient();

// 型定義
export interface VisitSession {
  id: string;
  session_code: string;
  primary_customer_id: string;
  is_group_visit: boolean;
  check_in_at: string;
  check_out_at?: string;
  status: string;
  table_segments?: TableSegment[];
  cast_engagements?: CastEngagement[];
}

export interface TableSegment {
  id: string;
  visit_id: string;
  table_id: number;
  started_at: string;
  ended_at?: string;
  reason?: string;
  notes?: string;
}

export interface CastEngagement {
  id: string;
  visit_id: string;
  cast_id: string;
  role: "primary" | "inhouse" | "help" | "douhan" | "after";
  nomination_type_id?: string;
  started_at: string;
  ended_at?: string;
  is_active: boolean;
  fee_amount: number;
  back_percentage: number;
  cast?: {
    id: string;
    stage_name: string;
    staff_code?: string;
  };
  nomination_type?: {
    display_name: string;
    price: number;
    back_rate: number;
  };
}

export interface BillItemAttribution {
  id: string;
  order_item_id: string;
  cast_id: string;
  attribution_percentage: number;
  attribution_amount: number;
  attribution_type:
    | "nomination"
    | "drink_for_cast"
    | "time_share"
    | "manual"
    | "auto";
  reason?: string;
  is_primary: boolean;
  cast?: {
    id: string;
    stage_name?: string;
  };
}

export class VisitSessionService {
  /**
   * 訪問セッションを作成
   */
  static async createSession(
    customerId: string,
    tableId: number,
    numGuests: number = 1
  ): Promise<string> {
    // セッションコード生成（例: V20250108-1234）
    const sessionCode = `V${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const { data: visit, error } = await supabase
      .from("visits")
      .insert({
        customer_id: customerId,
        primary_customer_id: customerId,
        num_guests: numGuests,
        is_group_visit: numGuests > 1,
        session_code: sessionCode,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    // Note: Creating table segments should be done on the server side
    // Use VisitSessionServerService.createSession via server actions

    return visit.id;
  }

  /**
   * テーブルセグメントを追加（配席・移動）
   */
  static async addTableSegment(
    visitId: string,
    tableId: number,
    reason: string = "move"
  ): Promise<void> {
    // 現在のセグメントを終了
    await supabase
      .from("visit_table_segments")
      .update({ ended_at: new Date().toISOString() })
      .eq("visit_id", visitId)
      .is("ended_at", null);

    // 新しいセグメントを開始
    const { error } = await supabase.from("visit_table_segments").insert({
      visit_id: visitId,
      table_id: tableId,
      reason,
    });

    if (error) throw error;

    // Note: visits.table_id is deprecated; rely on visit_table_segments
  }

  /**
   * キャストエンゲージメントを追加
   */
  static async addCastEngagement(
    visitId: string,
    castId: string,
    role: CastEngagement["role"],
    nominationTypeId?: string
  ): Promise<CastEngagement> {
    // 既存のアクティブなエンゲージメントをチェック
    const { data: existing } = await supabase
      .from("cast_engagements")
      .select("*")
      .eq("visit_id", visitId)
      .eq("cast_id", castId)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      throw new Error("このキャストは既にアクティブです");
    }

    // 指名種別から料金とバック率を取得
    let feeAmount = 0;
    let backPercentage = 0;

    if (nominationTypeId) {
      const { data: nominationType } = await supabase
        .from("nomination_types")
        .select("price, back_rate")
        .eq("id", nominationTypeId)
        .single();

      if (nominationType) {
        feeAmount = nominationType.price;
        backPercentage = nominationType.back_rate;
      }
    }

    const { data, error } = await supabase
      .from("cast_engagements")
      .insert({
        visit_id: visitId,
        cast_id: castId,
        role,
        nomination_type_id: nominationTypeId,
        fee_amount: feeAmount,
        back_percentage: backPercentage,
        is_active: true,
      })
      .select(
        `
        *,
        cast:casts_profile(id, stage_name),
        nomination_type:nomination_types(display_name, price, back_rate)
      `
      )
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * キャストエンゲージメントを終了
   */
  static async endCastEngagement(engagementId: string): Promise<void> {
    const { error } = await supabase
      .from("cast_engagements")
      .update({
        ended_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", engagementId);

    if (error) throw error;
  }

  /**
   * 訪問セッションの詳細を取得
   */
  static async getSessionDetails(
    visitId: string
  ): Promise<VisitSession | null> {
    const { data: visit, error } = await supabase
      .from("visits")
      .select(
        `
        *,
        table_segments:visit_table_segments(*),
        cast_engagements:cast_engagements(
          *,
          cast:casts_profile(id, stage_name),
          nomination_type:nomination_types(display_name, price, back_rate)
        )
      `
      )
      .eq("id", visitId)
      .single();

    if (error) {
      logger.error(
        "Error fetching session details",
        error,
        "VisitSessionService"
      );
      return null;
    }

    return visit;
  }

  /**
   * アクティブなセッション一覧を取得
   */
  static async getActiveSessions(): Promise<VisitSession[]> {
    const { data, error } = await supabase
      .from("visits")
      .select(
        `
        *,
        customer:customers(name, phone),
        table_segments:visit_table_segments!inner(*),
        cast_engagements:cast_engagements(
          *,
          cast:casts_profile(id, stage_name),
          nomination_type:nomination_types(display_name, price, back_rate)
        )
      `
      )
      .eq("status", "active")
      .is("table_segments.ended_at", null)
      .order("check_in_at", { ascending: false });

    if (error) {
      logger.error(
        "Error fetching active sessions",
        error,
        "VisitSessionService"
      );
      return [];
    }

    return data || [];
  }

  /**
   * 明細アトリビューションを追加
   */
  static async addItemAttribution(
    orderItemId: string,
    castId: string,
    percentage: number,
    type: BillItemAttribution["attribution_type"],
    reason?: string
  ): Promise<void> {
    // 注文明細の金額を取得
    const { data: orderItem } = await supabase
      .from("order_items")
      .select("total_amount")
      .eq("id", orderItemId)
      .single();

    if (!orderItem) {
      throw new Error("Order item not found");
    }

    const attributionAmount = Math.round(
      (orderItem.total_amount * percentage) / 100
    );

    const { error } = await supabase.from("bill_item_attributions").insert({
      order_item_id: orderItemId,
      cast_id: castId,
      attribution_percentage: percentage,
      attribution_amount: attributionAmount,
      attribution_type: type,
      reason,
      is_primary: percentage >= 50,
    });

    if (error) throw error;
  }

  /**
   * 自動アトリビューション計算
   */
  static async calculateAutoAttribution(
    orderItemId: string,
    visitId: string
  ): Promise<void> {
    // データベース関数を呼び出し
    const { error } = await supabase.rpc("calculate_auto_attribution", {
      p_order_item_id: orderItemId,
      p_visit_id: visitId,
    });

    if (error) throw error;
  }

  /**
   * 明細のアトリビューション一覧を取得
   */
  static async getItemAttributions(
    orderItemId: string
  ): Promise<BillItemAttribution[]> {
    const { data, error } = await supabase
      .from("bill_item_attributions")
      .select(
        `
        *,
        cast:casts_profile(id, stage_name)
      `
      )
      .eq("order_item_id", orderItemId)
      .order("attribution_percentage", { ascending: false });

    if (error) {
      logger.error("Error fetching attributions", error, "VisitSessionService");
      return [];
    }

    return data || [];
  }

  /**
   * セッションをマージ（合同卓）
   */
  static async mergeSessions(
    primarySessionId: string,
    secondarySessionIds: string[]
  ): Promise<void> {
    // セカンダリセッションを無効化し、マージ情報を記録
    for (const sessionId of secondarySessionIds) {
      await supabase
        .from("visits")
        .update({
          merged_to_visit_id: primarySessionId,
          status: "merged",
        })
        .eq("id", sessionId);

      // キャストエンゲージメントを移行
      await supabase
        .from("cast_engagements")
        .update({ visit_id: primarySessionId })
        .eq("visit_id", sessionId)
        .eq("is_active", true);

      // テーブルセグメントを終了
      await supabase
        .from("visit_table_segments")
        .update({ ended_at: new Date().toISOString() })
        .eq("visit_id", sessionId)
        .is("ended_at", null);
    }

    // プライマリセッションをグループ訪問として更新
    await supabase
      .from("visits")
      .update({ is_group_visit: true })
      .eq("id", primarySessionId);
  }

  /**
   * テーブル移動処理
   */
  static async moveTable(
    visitId: string,
    fromTableId: number,
    toTableId: number
  ): Promise<void> {
    // データベース関数を呼び出し
    const { error } = await supabase.rpc("move_visit_table", {
      p_visit_id: visitId,
      p_from_table_id: fromTableId,
      p_to_table_id: toTableId,
      p_reason: "move",
    });

    if (error) throw error;
  }

  /**
   * 給与計算用の売上ファクトを取得
   */
  static async getPayrollFacts(
    castId: string,
    startDate: string,
    endDate: string
  ): Promise<unknown[]> {
    const { data, error } = await supabase
      .from("payroll_revenue_facts")
      .select("*")
      .eq("cast_id", castId)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .order("work_date", { ascending: false });

    if (error) {
      logger.error(
        "Error fetching payroll facts",
        error,
        "VisitSessionService"
      );
      return [];
    }

    return data || [];
  }
}
