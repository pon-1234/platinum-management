import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
} from "date-fns";
import type {
  BottleKeepAlert,
  BottleKeepInventory,
  ExpiryManagement,
  BottleKeepDetail,
} from "@/types/bottle-keep.types";
import { notificationService } from "./notification.service";

type BottleWithRelations = BottleKeep & {
  customer?: {
    id: string;
    name: string;
    phone_number?: string | null;
    line_id?: string | null;
  };
  product?: {
    id: string;
    name: string;
    category?: string | null;
    price?: number | null;
  };
};

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
  private static resolveClient(
    supabaseClient?: SupabaseClient
  ): SupabaseClient {
    if (supabaseClient) {
      return supabaseClient;
    }

    if (typeof window === "undefined") {
      throw new Error(
        "BottleKeepService requires a Supabase client when used on the server"
      );
    }

    return createClient();
  }
  private static readonly EXPIRY_SOON_DAYS = 30;
  // ボトルキープ一覧取得
  static async getBottleKeeps(
    status?: "active" | "consumed" | "expired" | "removed",
    customer_id?: string,
    supabaseClient?: SupabaseClient
  ): Promise<BottleKeep[]> {
    const supabase = this.resolveClient(supabaseClient);
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
    if (error) {
      // フィールド差異で失敗する環境向けに最小限の選択にフォールバック
      const { data: minimal } = await supabase
        .from("bottle_keeps")
        .select("*")
        .order("created_at", { ascending: false });
      return (minimal as BottleKeep[]) || [];
    }
    return data || [];
  }

  // ボトルキープ詳細取得
  static async getBottleKeep(
    id: string,
    supabaseClient?: SupabaseClient
  ): Promise<BottleKeep | null> {
    const supabase = this.resolveClient(supabaseClient);
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
    bottle_number: string,
    supabaseClient?: SupabaseClient
  ): Promise<BottleKeep | null> {
    const supabase = this.resolveClient(supabaseClient);
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
    input: CreateBottleKeepInput,
    supabaseClient?: SupabaseClient
  ): Promise<BottleKeep> {
    const supabase = this.resolveClient(supabaseClient);

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
    await this.addHistory(
      {
        bottle_keep_id: data.id,
        action_type: "status_change",
        notes: "ボトルキープ登録",
        staff_id: staff?.id,
      },
      supabase
    );

    return data;
  }

  // ボトルキープ更新
  static async updateBottleKeep(
    id: string,
    input: UpdateBottleKeepInput,
    supabaseClient?: SupabaseClient
  ): Promise<BottleKeep> {
    const supabase = this.resolveClient(supabaseClient);

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
      await this.addHistory(
        {
          bottle_keep_id: id,
          action_type: "status_change",
          notes: `ステータス変更: ${oldData?.status} → ${input.status}`,
          staff_id: staff?.id,
        },
        supabase
      );
    }

    return data;
  }

  // ボトル提供（残量更新）
  static async serveBottle(
    input: ServeBottleInput,
    supabaseClient?: SupabaseClient
  ): Promise<BottleKeep> {
    const supabase = this.resolveClient(supabaseClient);

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
    await this.addHistory(
      {
        bottle_keep_id: input.bottle_keep_id,
        visit_id: input.visit_id,
        action_type: "serve",
        served_amount: input.served_amount,
        remaining_before,
        remaining_after,
        notes: input.notes,
        staff_id: staff?.id,
      },
      supabase
    );

    return data;
  }

  // ボトル移動
  static async moveBottle(
    bottle_keep_id: string,
    to_location: string,
    reason?: string,
    supabaseClient?: SupabaseClient
  ): Promise<BottleKeep> {
    const supabase = this.resolveClient(supabaseClient);

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

    await this.addHistory(
      {
        bottle_keep_id,
        action_type: "move",
        notes: `移動: ${from_location || "未設定"} → ${to_location}`,
        staff_id: staff?.id,
      },
      supabase
    );

    return data;
  }

  // 履歴取得
  static async getHistories(
    bottle_keep_id: string,
    supabaseClient?: SupabaseClient
  ): Promise<BottleKeepHistory[]> {
    const supabase = this.resolveClient(supabaseClient);
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
  private static async addHistory(
    history: {
      bottle_keep_id: string;
      visit_id?: string;
      action_type: "serve" | "refill" | "move" | "status_change" | "note";
      served_amount?: number;
      remaining_before?: number;
      remaining_after?: number;
      notes?: string;
      staff_id?: string;
    },
    supabaseClient?: SupabaseClient
  ): Promise<void> {
    const supabase = this.resolveClient(supabaseClient);

    const { error } = await supabase
      .from("bottle_keep_histories")
      .insert(history);

    if (error) throw error;
  }

  // 期限切れボトルの更新
  static async updateExpiredBottles(
    supabaseClient?: SupabaseClient
  ): Promise<number> {
    const supabase = this.resolveClient(supabaseClient);
    const { data, error } = await supabase.rpc("update_expired_bottles");
    if (error) throw error;
    return typeof data === "number" ? data : 0;
  }

  // 統計情報取得（RPC関数使用）
  static async getStatistics(supabaseClient?: SupabaseClient): Promise<{
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
    const supabase = this.resolveClient(supabaseClient);

    try {
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
    } catch {
      // Fallback: テーブルから簡易集計
      const { data: bottles } = await supabase
        .from("bottle_keeps")
        .select(
          "id, status, expiry_date, bottle_number, customer_id, product_id"
        );

      const now = new Date();
      const soonMs = BottleKeepService.EXPIRY_SOON_DAYS * 24 * 60 * 60 * 1000;
      let total_active = 0;
      let total_expired = 0;
      let total_consumed = 0;
      let expiring_soon = 0;

      (bottles || []).forEach((b) => {
        if (b.status === "active") total_active += 1;
        if (b.status === "expired") total_expired += 1;
        if (b.status === "consumed") total_consumed += 1;
        if (b.expiry_date && b.status === "active") {
          const d = new Date(b.expiry_date as string);
          const diff = d.getTime() - now.getTime();
          if (diff > 0 && diff <= soonMs) expiring_soon += 1;
        }
      });

      // recent serves
      const { data: serves } = await supabase
        .from("bottle_keep_histories")
        .select("bottle_keep_id, created_at")
        .eq("action_type", "serve")
        .order("created_at", { ascending: false })
        .limit(5);

      let recent_serves: Array<{
        bottle_id: string;
        bottle_number: string;
        product_name: string;
        customer_name: string;
        served_date: string;
        remaining: number;
      }> = [];

      if (serves && serves.length) {
        const ids = Array.from(
          new Set(serves.map((s) => s.bottle_keep_id as string))
        );
        type MinimalBottle = {
          id: string;
          bottle_number: string | null;
          remaining_percentage: number | null;
          customer?: { name?: string | null } | null;
          product?: { name?: string | null } | null;
        };
        const { data: bkRows } = await supabase
          .from("bottle_keeps")
          .select(
            `id, bottle_number, remaining_percentage, customer:customers(name), product:products(name)`
          )
          .in("id", ids);
        const map = new Map(
          (bkRows || []).map((r) => [r.id, r as MinimalBottle])
        );
        recent_serves = (serves || []).map(
          (s: { bottle_keep_id: string; created_at: string }) => {
            const r = map.get(s.bottle_keep_id);
            return {
              bottle_id: s.bottle_keep_id,
              bottle_number: r?.bottle_number || "",
              product_name: r?.product?.name || "",
              customer_name: r?.customer?.name || "",
              served_date: s.created_at,
              remaining:
                typeof r?.remaining_percentage === "number"
                  ? r.remaining_percentage
                  : 0,
            };
          }
        );
      }

      return {
        total_active,
        total_expired,
        total_consumed,
        expiring_soon,
        by_product: [],
        by_customer: [],
        recent_serves,
      };
    }
  }

  // 顧客別統計情報取得
  static async getCustomerStatistics(
    customerId: string,
    supabaseClient?: SupabaseClient
  ): Promise<{
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
    const supabase = this.resolveClient(supabaseClient);

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
    endDate?: string,
    supabaseClient?: SupabaseClient
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
    const supabase = this.resolveClient(supabaseClient);

    const params: Record<string, string> = {};
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;

    const { data, error } = await supabase.rpc(
      "get_bottle_keep_monthly_statistics",
      params
    );

    if (error) throw error;

    return data || [];
  }

  // 保管場所の候補一覧を取得
  static async getStorageLocations(
    supabaseClient?: SupabaseClient
  ): Promise<string[]> {
    const supabase = this.resolveClient(supabaseClient);
    const { data, error } = await supabase
      .from("bottle_keeps")
      .select("storage_location")
      .not("storage_location", "is", null);

    if (error) throw error;

    const unique = new Set(
      (data || [])
        .map(
          (row) =>
            (row as { storage_location?: string | null }).storage_location
        )
        .filter((loc): loc is string => Boolean(loc))
    );

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }

  // 期限切れ・期限間近・残量不足などのアラートを生成
  static async getAlerts(supabaseClient?: SupabaseClient): Promise<
    Array<
      BottleKeepAlert & {
        customerPhone?: string | null;
        customerLineId?: string | null;
      }
    >
  > {
    const supabase = this.resolveClient(supabaseClient);
    const today = new Date();

    const { data, error } = await supabase
      .from("bottle_keeps")
      .select(
        `
        *,
        customer:customers(id, name, phone_number, line_id),
        product:products(id, name, price)
      `
      )
      .neq("status", "removed");

    if (error) throw error;

    const alerts: Array<
      BottleKeepAlert & {
        customerPhone?: string | null;
        customerLineId?: string | null;
      }
    > = [];

    (data || ([] as BottleWithRelations[])).forEach((bottle) => {
      const expiryDate = bottle.expiry_date
        ? new Date(bottle.expiry_date)
        : null;
      const rawRemaining =
        (bottle as Record<string, unknown>).remaining_percentage ??
        (bottle as Record<string, unknown>).remaining_amount ??
        0;
      const remainingFraction =
        typeof rawRemaining === "number"
          ? rawRemaining > 1
            ? rawRemaining / 100
            : rawRemaining
          : 0;
      const daysUntilExpiry =
        expiryDate != null
          ? differenceInCalendarDays(expiryDate, today)
          : undefined;

      const base = {
        bottleKeepId: bottle.id,
        customerName: bottle.customer?.name || "不明な顧客",
        productName: bottle.product?.name || "不明な商品",
        expiryDate: bottle.expiry_date || undefined,
        remainingAmount: remainingFraction,
        daysUntilExpiry,
        customerPhone: bottle.customer?.phone_number,
        customerLineId: bottle.customer?.line_id || undefined,
      };

      if (bottle.status === "expired" || (daysUntilExpiry ?? 1) < 0) {
        alerts.push({
          id: `${bottle.id}-expired`,
          ...base,
          alertType: "expired",
          severity: "critical",
          message: "ボトルの期限が切れています。",
        });
      } else if (daysUntilExpiry !== undefined && daysUntilExpiry <= 7) {
        alerts.push({
          id: `${bottle.id}-expiring`,
          ...base,
          alertType: "expiring",
          severity: daysUntilExpiry <= 3 ? "critical" : "warning",
          message: `ボトルの期限が${daysUntilExpiry}日後に迫っています。`,
        });
      }

      if (remainingFraction <= 0.1) {
        alerts.push({
          id: `${bottle.id}-low`,
          ...base,
          alertType: "low_amount",
          severity: remainingFraction <= 0.05 ? "critical" : "warning",
          message: `ボトル残量が${Math.round(
            remainingFraction * 100
          )}%まで減っています。`,
        });
      }
    });

    return alerts;
  }

  // 期限管理用のデータを分類して返す
  static async getExpiryManagement(
    supabaseClient?: SupabaseClient
  ): Promise<ExpiryManagement> {
    const supabase = this.resolveClient(supabaseClient);
    const today = new Date();
    const weekEnd = addDays(today, 7);
    const monthEnd = endOfMonth(today);

    const { data, error } = await supabase
      .from("bottle_keeps")
      .select(
        `
        *,
        customer:customers(id, name, phone_number),
        product:products(id, name, category, price)
      `
      )
      .neq("status", "removed");

    if (error) throw error;

    const result: ExpiryManagement = {
      expiringToday: [],
      expiringThisWeek: [],
      expiringThisMonth: [],
      expired: [],
    };

    (data || ([] as BottleWithRelations[])).forEach((bottle) => {
      if (!bottle.expiry_date) return;
      const expiry = new Date(bottle.expiry_date);

      if (expiry < today || bottle.status === "expired") {
        result.expired.push(bottle);
        return;
      }

      if (differenceInCalendarDays(expiry, today) === 0) {
        result.expiringToday.push(bottle);
        return;
      }

      if (expiry <= weekEnd) {
        result.expiringThisWeek.push(bottle);
        return;
      }

      if (expiry <= monthEnd) {
        result.expiringThisMonth.push(bottle);
      }
    });

    return result;
  }

  // 保管場所ごとの在庫一覧を返す
  static async getInventory(
    supabaseClient?: SupabaseClient
  ): Promise<BottleKeepInventory[]> {
    const supabase = this.resolveClient(supabaseClient);
    const { data, error } = await supabase
      .from("bottle_keeps")
      .select(
        `
        *,
        customer:customers(id, name),
        product:products(id, name, price)
      `
      )
      .neq("status", "removed");

    if (error) throw error;

    const buckets = new Map<string, BottleKeepInventory>();

    (data || ([] as BottleWithRelations[])).forEach((bottle) => {
      const key = bottle.storage_location || "未設定";
      const entry: BottleKeepInventory = buckets.get(key) || {
        storageLocation: key,
        bottles: [],
        totalBottles: 0,
        totalValue: 0,
      };

      const rawRemaining =
        (bottle as Record<string, unknown>).remaining_percentage ??
        (bottle as Record<string, unknown>).remaining_amount ??
        0;
      const remainingFraction =
        typeof rawRemaining === "number"
          ? rawRemaining > 1
            ? rawRemaining / 100
            : rawRemaining
          : 0;
      const price = bottle.product?.price || 0;

      entry.bottles.push({
        ...(bottle as BottleKeepDetail),
        remaining_amount:
          (bottle as { remaining_amount?: number }).remaining_amount ??
          (bottle as { remaining_percentage?: number }).remaining_percentage ??
          0,
      });
      entry.totalBottles += 1;
      entry.totalValue += price * remainingFraction;

      buckets.set(key, entry);
    });

    return Array.from(buckets.values()).sort(
      (a, b) => b.totalBottles - a.totalBottles
    );
  }

  // アラートを送信（メール/SMS/LINE は NotificationService に委譲）
  static async sendExpiryAlerts(supabaseClient?: SupabaseClient): Promise<{
    sent: number;
    failed: number;
    results: Awaited<
      ReturnType<typeof notificationService.sendBulkBottleKeepAlerts>
    >["results"];
  }> {
    const alerts = await this.getAlerts(supabaseClient);
    // 期限系のアラートのみ送信対象にする
    const targets = alerts.filter(
      (a) => a.alertType === "expired" || a.alertType === "expiring"
    );

    if (targets.length === 0) {
      return { sent: 0, failed: 0, results: [] };
    }

    const payload = targets.map((alert) => ({
      customerName: alert.customerName,
      customerPhone: alert.customerPhone || undefined,
      customerLineId: alert.customerLineId || undefined,
      productName: alert.productName,
      alertType: alert.alertType,
      alertMessage: alert.message,
    }));

    const result = await notificationService.sendBulkBottleKeepAlerts(payload);

    return {
      sent: result.successCount,
      failed: result.failedCount,
      results: result.results,
    };
  }
}
