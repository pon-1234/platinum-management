import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  BottleKeep,
  BottleKeepDetail,
  CreateBottleKeepRequest,
  UpdateBottleKeepData,
  UseBottleKeepRequest,
  BottleKeepStats,
  BottleKeepAlert,
  BottleKeepSearchFilter,
  CustomerBottleKeepSummary,
  // BottleKeepReport,
  ExpiryManagement,
  BottleKeepInventory,
} from "@/types/bottle-keep.types";

export class BottleKeepService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createClient();
  }

  // ボトルキープ一覧取得
  async getBottleKeeps(
    filter?: BottleKeepSearchFilter
  ): Promise<BottleKeepDetail[]> {
    let query = this.supabase.from("bottle_keeps").select(`
        *,
        customer:customers(id, name, phone_number),
        product:products(id, name, category, price),
        usage_history:bottle_keep_usage(
          id,
          amount_used,
          notes,
          created_at,
          visit:visits(id, check_in_at)
        )
      `);

    if (filter?.customerId) {
      query = query.eq("customer_id", filter.customerId);
    }

    if (filter?.productId) {
      query = query.eq("product_id", filter.productId);
    }

    if (filter?.status) {
      query = query.eq("status", filter.status);
    }

    if (filter?.storageLocation) {
      query = query.eq("storage_location", filter.storageLocation);
    }

    if (filter?.expiringWithin) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + filter.expiringWithin);
      query = query.lte("expiry_date", targetDate.toISOString().split("T")[0]);
    }

    if (filter?.lowAmount) {
      query = query.lt("remaining_amount", 0.25); // 25%以下
    }

    if (filter?.searchTerm) {
      // 顧客名または商品名で検索（結合後にフィルタリング）
      // ここではクライアントサイドでフィルタリング
    }

    if (filter?.sortBy) {
      const order = filter.sortOrder || "asc";
      switch (filter.sortBy) {
        case "expiryDate":
          query = query.order("expiry_date", { ascending: order === "asc" });
          break;
        case "openedDate":
          query = query.order("opened_date", { ascending: order === "asc" });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`ボトルキープ取得エラー: ${error.message}`);
    }

    let results = (data || []) as BottleKeepDetail[];

    // 使用合計量を計算
    results = results.map((bottle) => ({
      ...bottle,
      total_used:
        bottle.usage_history?.reduce(
          (sum, usage) => sum + usage.amount_used,
          0
        ) || 0,
    }));

    // クライアントサイド検索フィルタリング
    if (filter?.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      results = results.filter(
        (bottle) =>
          bottle.customer?.name.toLowerCase().includes(searchLower) ||
          bottle.product?.name.toLowerCase().includes(searchLower)
      );
    }

    return results;
  }

  // ボトルキープ詳細取得
  async getBottleKeepById(id: string): Promise<BottleKeepDetail | null> {
    const { data, error } = await this.supabase
      .from("bottle_keeps")
      .select(
        `
        *,
        customer:customers(id, name, phone_number, line_id),
        product:products(id, name, category, price),
        usage_history:bottle_keep_usage(
          id,
          amount_used,
          notes,
          created_at,
          created_by,
          visit:visits(id, check_in_at, check_out_at),
          staff:staffs(full_name)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`ボトルキープ取得エラー: ${error.message}`);
    }

    const bottle = data as BottleKeepDetail;
    bottle.total_used =
      bottle.usage_history?.reduce(
        (sum, usage) => sum + usage.amount_used,
        0
      ) || 0;

    return bottle;
  }

  // ボトルキープ作成
  async createBottleKeep(data: CreateBottleKeepRequest): Promise<BottleKeep> {
    // ボトル番号の自動生成（指定されていない場合）
    let bottleNumber = data.bottleNumber;
    if (!bottleNumber) {
      const count = await this.getBottleKeepCount();
      bottleNumber = `BK${String(count + 1).padStart(6, "0")}`;
    }

    // 期限日の自動設定（指定されていない場合、開封から6ヶ月後）
    let expiryDate = data.expiryDate;
    if (!expiryDate) {
      const expiry = new Date(data.openedDate);
      expiry.setMonth(expiry.getMonth() + 6);
      expiryDate = expiry.toISOString().split("T")[0];
    }

    const { data: bottle, error } = await this.supabase
      .from("bottle_keeps")
      .insert({
        customer_id: data.customerId,
        product_id: data.productId,
        opened_date: data.openedDate,
        expiry_date: expiryDate,
        bottle_number: bottleNumber,
        storage_location: data.storageLocation,
        notes: data.notes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`ボトルキープ作成エラー: ${error.message}`);
    }

    return bottle;
  }

  // ボトルキープ更新
  async updateBottleKeep(
    id: string,
    data: UpdateBottleKeepData
  ): Promise<BottleKeep> {
    const { data: bottle, error } = await this.supabase
      .from("bottle_keeps")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`ボトルキープ更新エラー: ${error.message}`);
    }

    return bottle;
  }

  // ボトルキープ使用記録
  async useBottleKeep(data: UseBottleKeepRequest): Promise<void> {
    const bottle = await this.getBottleKeepById(data.bottleKeepId);
    if (!bottle) {
      throw new Error("ボトルキープが見つかりません");
    }

    if (bottle.status !== "active") {
      throw new Error("このボトルキープは使用できません");
    }

    const newRemainingAmount = bottle.remaining_amount - data.amountUsed;
    if (newRemainingAmount < 0) {
      throw new Error("残量が不足しています");
    }

    // 使用履歴を記録
    const { error: usageError } = await this.supabase
      .from("bottle_keep_usage")
      .insert({
        bottle_keep_id: data.bottleKeepId,
        visit_id: data.visitId,
        amount_used: data.amountUsed,
        notes: data.notes,
      });

    if (usageError) {
      throw new Error(`使用履歴記録エラー: ${usageError.message}`);
    }

    // 残量を更新
    const updateData: UpdateBottleKeepData = {
      remaining_amount: newRemainingAmount,
    };

    // 完全に消費された場合はステータスを変更
    if (newRemainingAmount === 0) {
      updateData.status = "consumed";
    }

    await this.updateBottleKeep(data.bottleKeepId, updateData);
  }

  // ボトルキープ統計
  async getBottleKeepStats(): Promise<BottleKeepStats> {
    const allBottles = await this.getBottleKeeps();

    const totalBottles = allBottles.length;
    const activeBottles = allBottles.filter(
      (b) => b.status === "active"
    ).length;
    const expiredBottles = allBottles.filter(
      (b) => b.status === "expired"
    ).length;
    const consumedBottles = allBottles.filter(
      (b) => b.status === "consumed"
    ).length;

    const totalValue = allBottles
      .filter((b) => b.status === "active")
      .reduce(
        (sum, b) => sum + (b.product?.price || 0) * b.remaining_amount,
        0
      );

    // 一週間以内に期限切れ
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    const expiringTown = allBottles.filter(
      (b) =>
        b.status === "active" &&
        b.expiry_date &&
        new Date(b.expiry_date) <= oneWeekFromNow
    ).length;

    return {
      totalBottles,
      activeBottles,
      expiredBottles,
      consumedBottles,
      totalValue,
      expiringTown,
    };
  }

  // ボトルキープアラート
  async getBottleKeepAlerts(): Promise<BottleKeepAlert[]> {
    const bottles = await this.getBottleKeeps({ status: "active" });
    const alerts: BottleKeepAlert[] = [];
    const today = new Date();

    bottles.forEach((bottle) => {
      if (!bottle.expiry_date) return;

      const expiryDate = new Date(bottle.expiry_date);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 期限切れアラート
      if (daysUntilExpiry < 0) {
        alerts.push({
          id: `expired-${bottle.id}`,
          bottleKeepId: bottle.id,
          customerName: bottle.customer?.name || "不明",
          productName: bottle.product?.name || "不明",
          alertType: "expired",
          severity: "critical",
          message: `期限切れ（${Math.abs(daysUntilExpiry)}日経過）`,
          expiryDate: bottle.expiry_date,
          daysUntilExpiry,
        });
      } else if (daysUntilExpiry <= 7) {
        // 期限間近アラート
        alerts.push({
          id: `expiring-${bottle.id}`,
          bottleKeepId: bottle.id,
          customerName: bottle.customer?.name || "不明",
          productName: bottle.product?.name || "不明",
          alertType: "expiring",
          severity: daysUntilExpiry <= 3 ? "critical" : "warning",
          message: `期限まで${daysUntilExpiry}日`,
          expiryDate: bottle.expiry_date,
          daysUntilExpiry,
        });
      }

      // 残量少量アラート（25%以下）
      if (bottle.remaining_amount <= 0.25) {
        alerts.push({
          id: `low-amount-${bottle.id}`,
          bottleKeepId: bottle.id,
          customerName: bottle.customer?.name || "不明",
          productName: bottle.product?.name || "不明",
          alertType: "low_amount",
          severity: bottle.remaining_amount <= 0.1 ? "critical" : "warning",
          message: `残量${Math.round(bottle.remaining_amount * 100)}%`,
          remainingAmount: bottle.remaining_amount,
        });
      }
    });

    return alerts.sort((a, b) => {
      if (a.severity === "critical" && b.severity === "warning") return -1;
      if (a.severity === "warning" && b.severity === "critical") return 1;
      return 0;
    });
  }

  // 顧客別ボトルキープサマリー
  async getCustomerBottleKeepSummary(
    customerId: string
  ): Promise<CustomerBottleKeepSummary> {
    const bottles = await this.getBottleKeeps({ customerId });
    const customer = bottles[0]?.customer;

    const totalBottles = bottles.length;
    const activeBottles = bottles.filter((b) => b.status === "active").length;
    const totalValue = bottles
      .filter((b) => b.status === "active")
      .reduce(
        (sum, b) => sum + (b.product?.price || 0) * b.remaining_amount,
        0
      );

    return {
      customerId,
      customerName: customer?.name || "不明",
      totalBottles,
      activeBottles,
      totalValue,
      bottles,
    };
  }

  // 期限管理
  async getExpiryManagement(): Promise<ExpiryManagement> {
    const allBottles = await this.getBottleKeeps({ status: "active" });
    const today = new Date();
    const oneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringToday = allBottles.filter((b) => {
      if (!b.expiry_date) return false;
      const expiry = new Date(b.expiry_date);
      return expiry.toDateString() === today.toDateString();
    });

    const expiringThisWeek = allBottles.filter((b) => {
      if (!b.expiry_date) return false;
      const expiry = new Date(b.expiry_date);
      return expiry > today && expiry <= oneWeek;
    });

    const expiringThisMonth = allBottles.filter((b) => {
      if (!b.expiry_date) return false;
      const expiry = new Date(b.expiry_date);
      return expiry > oneWeek && expiry <= oneMonth;
    });

    const expired = await this.getBottleKeeps({ status: "expired" });

    return {
      expiringToday,
      expiringThisWeek,
      expiringThisMonth,
      expired,
    };
  }

  // 在庫状況（保管場所別）
  async getBottleKeepInventory(): Promise<BottleKeepInventory[]> {
    const bottles = await this.getBottleKeeps({ status: "active" });
    const locationMap = new Map<string, BottleKeepDetail[]>();

    bottles.forEach((bottle) => {
      const location = bottle.storage_location || "未設定";
      if (!locationMap.has(location)) {
        locationMap.set(location, []);
      }
      locationMap.get(location)!.push(bottle);
    });

    return Array.from(locationMap.entries()).map(([location, bottles]) => ({
      storageLocation: location,
      bottles,
      totalBottles: bottles.length,
      totalValue: bottles.reduce(
        (sum, b) => sum + (b.product?.price || 0) * b.remaining_amount,
        0
      ),
    }));
  }

  // 期限切れボトルの自動更新
  async updateExpiredBottles(): Promise<number> {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await this.supabase
      .from("bottle_keeps")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expiry_date", today)
      .select("id");

    if (error) {
      throw new Error(`期限切れボトル更新エラー: ${error.message}`);
    }

    return data?.length || 0;
  }

  // ボトルキープ総数取得（ボトル番号生成用）
  private async getBottleKeepCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from("bottle_keeps")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw new Error(`ボトルキープ数取得エラー: ${error.message}`);
    }

    return count || 0;
  }

  // 保管場所一覧取得
  async getStorageLocations(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("bottle_keeps")
      .select("storage_location")
      .not("storage_location", "is", null);

    if (error) {
      throw new Error(`保管場所取得エラー: ${error.message}`);
    }

    const locations = [
      ...new Set(data?.map((d) => d.storage_location).filter(Boolean) || []),
    ];
    return locations.sort();
  }
}
