import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

export interface BottleKeep {
  id: string;
  customer_id: string;
  product_id: string;
  bottle_number: string;
  opened_date: string;
  expiry_date?: string;
  remaining_percentage: number;
  storage_location?: string;
  table_number?: string;
  host_staff_id?: string;
  notes?: string;
  status: "active" | "consumed" | "expired" | "removed";
  tags?: string[];
  last_served_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: {
    id: string;
    name: string;
    phone_number?: string;
  };
  product?: {
    id: string;
    name: string;
    category?: string;
    price?: number;
  };
  host_staff?: {
    id: string;
    full_name: string;
  };
}

export interface BottleKeepHistory {
  id: string;
  bottle_keep_id: string;
  visit_id?: string;
  action_type: "serve" | "refill" | "move" | "status_change" | "note";
  served_amount?: number;
  remaining_before?: number;
  remaining_after?: number;
  staff_id: string;
  notes?: string;
  created_at: string;
  staff?: {
    full_name: string;
  };
}

export interface CreateBottleKeepInput {
  customer_id: string;
  product_id: string;
  opened_date?: string;
  expiry_date?: string;
  storage_location?: string;
  table_number?: string;
  host_staff_id?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateBottleKeepInput {
  remaining_percentage?: number;
  storage_location?: string;
  table_number?: string;
  host_staff_id?: string;
  notes?: string;
  status?: "active" | "consumed" | "expired" | "removed";
  tags?: string[];
  last_served_date?: string;
}

export interface ServeBottleInput {
  bottle_keep_id: string;
  visit_id?: string;
  served_amount: number;
  notes?: string;
}

export class BottleKeepService {
  // ボトルキープ一覧取得
  static async getBottleKeeps(
    status?: "active" | "consumed" | "expired" | "removed",
    customer_id?: string
  ): Promise<BottleKeep[]> {
    const supabase = createClient();
    let query = supabase
      .from("bottle_keeps")
      .select(
        `
        *,
        customer:customers(id, name, phone_number),
        product:products(id, name, category, price),
        host_staff:staffs(id, full_name)
      `
      )
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    if (customer_id) {
      query = query.eq("customer_id", customer_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // ボトルキープ詳細取得
  static async getBottleKeep(id: string): Promise<BottleKeep | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bottle_keeps")
      .select(
        `
        *,
        customer:customers(id, name, phone_number),
        product:products(id, name, category, price),
        host_staff:staffs(id, full_name)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  // ボトル番号で検索
  static async getBottleKeepByNumber(
    bottle_number: string
  ): Promise<BottleKeep | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bottle_keeps")
      .select(
        `
        *,
        customer:customers(id, name, phone_number),
        product:products(id, name, category, price),
        host_staff:staffs(id, full_name)
      `
      )
      .eq("bottle_number", bottle_number)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  // ボトルキープ作成
  static async createBottleKeep(
    input: CreateBottleKeepInput
  ): Promise<BottleKeep> {
    const supabase = createClient();

    // ボトル番号を生成
    const { data: bottleNumber, error: numberError } = await supabase.rpc(
      "generate_bottle_number"
    );

    if (numberError) throw numberError;

    // 現在のユーザーIDを取得
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: staff } = await supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    const { data, error } = await supabase
      .from("bottle_keeps")
      .insert({
        ...input,
        bottle_number: bottleNumber,
        opened_date: input.opened_date || format(new Date(), "yyyy-MM-dd"),
        created_by: staff?.id,
      })
      .select(
        `
        *,
        customer:customers(id, name, phone_number),
        product:products(id, name, category, price),
        host_staff:staffs(id, full_name)
      `
      )
      .single();

    if (error) throw error;

    // 履歴を記録
    await this.addHistory({
      bottle_keep_id: data.id,
      action_type: "status_change",
      notes: "ボトルキープ登録",
      staff_id: staff?.id,
    });

    return data;
  }

  // ボトルキープ更新
  static async updateBottleKeep(
    id: string,
    input: UpdateBottleKeepInput
  ): Promise<BottleKeep> {
    const supabase = createClient();

    // 更新前の状態を取得
    const { data: oldData } = await supabase
      .from("bottle_keeps")
      .select("*")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("bottle_keeps")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        *,
        customer:customers(id, name, phone_number),
        product:products(id, name, category, price),
        host_staff:staffs(id, full_name)
      `
      )
      .single();

    if (error) throw error;

    // 現在のユーザーIDを取得
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: staff } = await supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    // ステータス変更の履歴を記録
    if (oldData?.status !== input.status && input.status) {
      await this.addHistory({
        bottle_keep_id: id,
        action_type: "status_change",
        notes: `ステータス変更: ${oldData?.status} → ${input.status}`,
        staff_id: staff?.id,
      });
    }

    return data;
  }

  // ボトル提供（残量更新）
  static async serveBottle(input: ServeBottleInput): Promise<BottleKeep> {
    const supabase = createClient();

    // 現在の状態を取得
    const { data: currentBottle } = await supabase
      .from("bottle_keeps")
      .select("*")
      .eq("id", input.bottle_keep_id)
      .single();

    if (!currentBottle) {
      throw new Error("ボトルが見つかりません");
    }

    const remaining_before = currentBottle.remaining_percentage;
    const remaining_after = Math.max(0, remaining_before - input.served_amount);

    // 残量を更新
    const { data, error } = await supabase
      .from("bottle_keeps")
      .update({
        remaining_percentage: remaining_after,
        last_served_date: format(new Date(), "yyyy-MM-dd"),
        status: remaining_after === 0 ? "consumed" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.bottle_keep_id)
      .select(
        `
        *,
        customer:customers(id, name, phone_number),
        product:products(id, name, category, price),
        host_staff:staffs(id, full_name)
      `
      )
      .single();

    if (error) throw error;

    // 現在のユーザーIDを取得
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: staff } = await supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    // 提供履歴を記録
    await this.addHistory({
      bottle_keep_id: input.bottle_keep_id,
      visit_id: input.visit_id,
      action_type: "serve",
      served_amount: input.served_amount,
      remaining_before,
      remaining_after,
      notes: input.notes,
      staff_id: staff?.id,
    });

    return data;
  }

  // ボトル移動
  static async moveBottle(
    bottle_keep_id: string,
    to_location: string,
    reason?: string
  ): Promise<BottleKeep> {
    const supabase = createClient();

    // 現在の位置を取得
    const { data: currentBottle } = await supabase
      .from("bottle_keeps")
      .select("storage_location")
      .eq("id", bottle_keep_id)
      .single();

    const from_location = currentBottle?.storage_location;

    // 位置を更新
    const { data, error } = await supabase
      .from("bottle_keeps")
      .update({
        storage_location: to_location,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bottle_keep_id)
      .select(
        `
        *,
        customer:customers(id, name, phone_number),
        product:products(id, name, category, price),
        host_staff:staffs(id, full_name)
      `
      )
      .single();

    if (error) throw error;

    // 現在のユーザーIDを取得
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: staff } = await supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    // 移動履歴を記録
    await supabase.from("bottle_movements").insert({
      bottle_keep_id,
      from_location,
      to_location,
      moved_by: staff?.id,
      reason,
    });

    await this.addHistory({
      bottle_keep_id,
      action_type: "move",
      notes: `移動: ${from_location || "未設定"} → ${to_location}`,
      staff_id: staff?.id,
    });

    return data;
  }

  // 履歴取得
  static async getHistories(
    bottle_keep_id: string
  ): Promise<BottleKeepHistory[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bottle_keep_histories")
      .select(
        `
        *,
        staff:staffs(full_name)
      `
      )
      .eq("bottle_keep_id", bottle_keep_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // 履歴追加（内部用）
  private static async addHistory(history: {
    bottle_keep_id: string;
    visit_id?: string;
    action_type: "serve" | "refill" | "move" | "status_change" | "note";
    served_amount?: number;
    remaining_before?: number;
    remaining_after?: number;
    notes?: string;
    staff_id?: string;
  }): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from("bottle_keep_histories")
      .insert(history);

    if (error) throw error;
  }

  // 期限切れボトルの更新
  static async updateExpiredBottles(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc("update_expired_bottles");
    if (error) throw error;
  }

  // 統計情報取得（RPC関数使用）
  static async getStatistics(): Promise<{
    total_active: number;
    total_expired: number;
    total_consumed: number;
    expiring_soon: number;
    by_product?: Array<{
      product_id: string;
      product_name: string;
      total: number;
      active: number;
      consumed: number;
    }>;
    by_customer?: Array<{
      customer_id: string;
      customer_name: string;
      total: number;
      active: number;
    }>;
    recent_serves?: Array<{
      bottle_id: string;
      bottle_number: string;
      product_name: string;
      customer_name: string;
      served_date: string;
      remaining: number;
    }>;
  }> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_bottle_keep_statistics");

    if (error) throw error;

    return (
      data || {
        total_active: 0,
        total_expired: 0,
        total_consumed: 0,
        expiring_soon: 0,
        by_product: [],
        by_customer: [],
        recent_serves: [],
      }
    );
  }

  // 顧客別統計情報取得
  static async getCustomerStatistics(customerId: string): Promise<{
    total_bottles: number;
    active_bottles: number;
    consumed_bottles: number;
    total_served: number;
    bottles: Array<{
      id: string;
      bottle_number: string;
      product_name: string;
      opened_date: string;
      expiry_date?: string;
      remaining_percentage: number;
      status: string;
      storage_location?: string;
      last_served_date?: string;
    }>;
  }> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "get_customer_bottle_statistics",
      { p_customer_id: customerId }
    );

    if (error) throw error;

    return (
      data || {
        total_bottles: 0,
        active_bottles: 0,
        consumed_bottles: 0,
        total_served: 0,
        bottles: [],
      }
    );
  }

  // 月別統計情報取得
  static async getMonthlyStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<
    Array<{
      month: string;
      new_bottles: number;
      consumed_bottles: number;
      expired_bottles: number;
      total_serves: number;
      total_served_amount: number;
    }>
  > {
    const supabase = createClient();

    const params: any = {};
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    const { data, error } = await supabase.rpc(
      "get_bottle_keep_monthly_statistics",
      params
    );

    if (error) throw error;

    return data || [];
  }
}
