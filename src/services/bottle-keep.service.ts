import { BaseService } from "./base.service";
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
import {
  notificationService,
  type AlertNotificationData,
} from "./notification.service";

export class BottleKeepService extends BaseService {
  constructor() {
    super();
  }

  // ボトルキープ一覧取得
  async getBottleKeeps(
    filter?: BottleKeepSearchFilter
  ): Promise<BottleKeepDetail[]> {
    try {
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
        query = query.lte(
          "expiry_date",
          targetDate.toISOString().split("T")[0]
        );
      }

      if (filter?.lowAmount) {
        query = query.lt("remaining_amount", 0.25); // 25%以下
      }

      if (filter?.searchTerm) {
        // 顧客名または商品名で検索をデータベース側で実行
        const searchPattern = `%${filter.searchTerm}%`;
        query = query.or(
          `customer.name.ilike.${searchPattern},product.name.ilike.${searchPattern}`
        );
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
        throw new Error(
          this.handleDatabaseError(error, "ボトルキープ取得に失敗しました")
        );
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

      return results;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getBottleKeeps failed:", error);
      }
      throw error;
    }
  }

  // ボトルキープ詳細取得
  async getBottleKeepById(id: string): Promise<BottleKeepDetail | null> {
    try {
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
        throw new Error(
          this.handleDatabaseError(error, "ボトルキープ取得に失敗しました")
        );
      }

      const bottle = data as BottleKeepDetail;
      bottle.total_used =
        bottle.usage_history?.reduce(
          (sum, usage) => sum + usage.amount_used,
          0
        ) || 0;

      return bottle;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getBottleKeepById failed:", error);
      }
      throw error;
    }
  }

  // ボトルキープ作成
  async createBottleKeep(data: CreateBottleKeepRequest): Promise<BottleKeep> {
    try {
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
        throw new Error(
          this.handleDatabaseError(error, "ボトルキープ作成に失敗しました")
        );
      }

      return bottle;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("createBottleKeep failed:", error);
      }
      throw error;
    }
  }

  // ボトルキープ更新
  async updateBottleKeep(
    id: string,
    data: UpdateBottleKeepData
  ): Promise<BottleKeep> {
    try {
      const { data: bottle, error } = await this.supabase
        .from("bottle_keeps")
        .update({ ...data })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "ボトルキープ更新に失敗しました")
        );
      }

      return bottle;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("updateBottleKeep failed:", error);
      }
      throw error;
    }
  }

  // ボトルキープ使用記録
  async useBottleKeep(data: UseBottleKeepRequest): Promise<void> {
    try {
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
        throw new Error(
          this.handleDatabaseError(usageError, "使用履歴記録に失敗しました")
        );
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
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("useBottleKeep failed:", error);
      }
      throw error;
    }
  }

  // ボトルキープ統計
  async getBottleKeepStats(): Promise<BottleKeepStats> {
    // ステータス別のカウントをデータベースで集計
    // ステータス別のカウントを個別に取得
    const { count: totalBottles } = await this.supabase
      .from("bottle_keeps")
      .select("*", { count: "exact", head: true });

    const { count: activeBottles } = await this.supabase
      .from("bottle_keeps")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { count: expiredBottles } = await this.supabase
      .from("bottle_keeps")
      .select("*", { count: "exact", head: true })
      .eq("status", "expired");

    const { count: consumedBottles } = await this.supabase
      .from("bottle_keeps")
      .select("*", { count: "exact", head: true })
      .eq("status", "consumed");

    // アクティブなボトルの総価値を計算
    const { data: activeBottlesData } = await this.supabase
      .from("bottle_keeps")
      .select("remaining_amount, product:products(price)")
      .eq("status", "active");

    const totalValue =
      activeBottlesData?.reduce(
        (sum, b) => sum + (b.product?.[0]?.price || 0) * b.remaining_amount,
        0
      ) || 0;

    // 一週間以内に期限切れ
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    const { count: expiringTown } = await this.supabase
      .from("bottle_keeps")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .lte("expiry_date", oneWeekFromNow.toISOString().split("T")[0]);

    return {
      totalBottles: totalBottles || 0,
      activeBottles: activeBottles || 0,
      expiredBottles: expiredBottles || 0,
      consumedBottles: consumedBottles || 0,
      totalValue,
      expiringTown: expiringTown || 0,
    };
  }

  // ボトルキープアラート
  async getBottleKeepAlerts(): Promise<BottleKeepAlert[]> {
    const alerts: BottleKeepAlert[] = [];
    const today = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    // 期限切れアラートをデータベースから直接取得
    const { data: expiredBottles } = await this.supabase
      .from("bottle_keeps")
      .select(
        `
        id,
        expiry_date,
        remaining_amount,
        customer:customers(name),
        product:products(name)
      `
      )
      .eq("status", "active")
      .lt("expiry_date", today.toISOString().split("T")[0]);

    // 期限間近アラートをデータベースから直接取得
    const { data: expiringBottles } = await this.supabase
      .from("bottle_keeps")
      .select(
        `
        id,
        expiry_date,
        remaining_amount,
        customer:customers(name),
        product:products(name)
      `
      )
      .eq("status", "active")
      .gte("expiry_date", today.toISOString().split("T")[0])
      .lte("expiry_date", oneWeekFromNow.toISOString().split("T")[0]);

    // 残量少量アラートをデータベースから直接取得
    const { data: lowAmountBottles } = await this.supabase
      .from("bottle_keeps")
      .select(
        `
        id,
        expiry_date,
        remaining_amount,
        customer:customers(name),
        product:products(name)
      `
      )
      .eq("status", "active")
      .lte("remaining_amount", 0.25);

    // 期限切れアラートを処理
    expiredBottles?.forEach((bottle) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(bottle.expiry_date).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      alerts.push({
        id: `expired-${bottle.id}`,
        bottleKeepId: bottle.id,
        customerName: bottle.customer?.[0]?.name || "不明",
        productName: bottle.product?.[0]?.name || "不明",
        alertType: "expired",
        severity: "critical",
        message: `期限切れ（${Math.abs(daysUntilExpiry)}日経過）`,
        expiryDate: bottle.expiry_date,
        daysUntilExpiry,
      });
    });

    // 期限間近アラートを処理
    expiringBottles?.forEach((bottle) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(bottle.expiry_date).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      alerts.push({
        id: `expiring-${bottle.id}`,
        bottleKeepId: bottle.id,
        customerName: bottle.customer?.[0]?.name || "不明",
        productName: bottle.product?.[0]?.name || "不明",
        alertType: "expiring",
        severity: daysUntilExpiry <= 3 ? "critical" : "warning",
        message: `期限まで${daysUntilExpiry}日`,
        expiryDate: bottle.expiry_date,
        daysUntilExpiry,
      });
    });

    // 残量少量アラートを処理
    lowAmountBottles?.forEach((bottle) => {
      alerts.push({
        id: `low-amount-${bottle.id}`,
        bottleKeepId: bottle.id,
        customerName: bottle.customer?.[0]?.name || "不明",
        productName: bottle.product?.[0]?.name || "不明",
        alertType: "low_amount",
        severity: bottle.remaining_amount <= 0.1 ? "critical" : "warning",
        message: `残量${Math.round(bottle.remaining_amount * 100)}%`,
        remainingAmount: bottle.remaining_amount,
      });
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
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await this.supabase
        .from("bottle_keeps")
        .update({ status: "expired" })
        .eq("status", "active")
        .lt("expiry_date", today)
        .select("id");

      if (error) {
        throw new Error(
          this.handleDatabaseError(
            error as { code?: string },
            "期限切れボトル更新に失敗しました"
          )
        );
      }

      return data?.length || 0;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("updateExpiredBottles failed:", error);
      }
      throw error;
    }
  }

  // ボトルキープ総数取得（ボトル番号生成用）
  private async getBottleKeepCount(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from("bottle_keeps")
        .select("*", { count: "exact", head: true });

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "ボトルキープ数取得に失敗しました")
        );
      }

      return count || 0;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getBottleKeepCount failed:", error);
      }
      throw error;
    }
  }

  // 保管場所一覧取得
  async getStorageLocations(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from("bottle_keeps")
        .select("storage_location")
        .not("storage_location", "is", null);

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "保管場所取得に失敗しました")
        );
      }

      const locations = [
        ...new Set(data?.map((d) => d.storage_location).filter(Boolean) || []),
      ];
      return locations.sort();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getStorageLocations failed:", error);
      }
      throw error;
    }
  }

  // 期限アラート送信機能
  async sendExpiryAlerts(): Promise<{
    success: boolean;
    sentCount: number;
    alerts: AlertNotificationData[];
    notificationResults?: {
      totalAlerts: number;
      successCount: number;
      failedCount: number;
      results: unknown[];
    };
  }> {
    try {
      // RPC関数を使用してアラート処理
      const { data, error } = await this.supabase.rpc(
        "process_bottle_keep_alerts"
      );

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("アラート処理エラー:", error);
        }
        // フォールバック: 基本的なアラート取得のみ
        const alerts = await this.getBottleKeepAlerts();
        return {
          success: false,
          sentCount: 0,
          alerts: alerts.map((alert) => ({
            customerName: alert.customerName,
            customerEmail: undefined,
            customerPhone: undefined,
            customerLineId: undefined,
            productName: alert.productName,
            alertType: alert.alertType,
            alertMessage: alert.message,
          })),
        };
      }

      const result = data as {
        alerts: Array<{
          customer_name: string;
          customer_email?: string;
          customer_phone?: string;
          customer_line_id?: string;
          product_name: string;
          alert_type: string;
          alert_message: string;
        }>;
        sent_count: number;
      } | null;

      if (!result) {
        return {
          success: false,
          sentCount: 0,
          alerts: [],
        };
      }

      // 実際の通知送信処理
      const alertsToSend: AlertNotificationData[] = result.alerts.map(
        (alert) => ({
          customerName: alert.customer_name,
          customerEmail: alert.customer_email,
          customerPhone: alert.customer_phone,
          customerLineId: alert.customer_line_id,
          productName: alert.product_name,
          alertType: alert.alert_type,
          alertMessage: alert.alert_message,
        })
      );

      // 通知サービスを使用してアラートを送信
      const notificationResults =
        await notificationService.sendBulkBottleKeepAlerts(alertsToSend);

      return {
        success: true,
        sentCount: result.sent_count,
        alerts: alertsToSend,
        notificationResults,
      };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("アラート送信エラー:", error);
      }
      return {
        success: false,
        sentCount: 0,
        alerts: [],
      };
    }
  }

  // 未送信アラート取得
  async getUnsentAlerts(): Promise<BottleKeepAlert[]> {
    try {
      const { data, error } = await this.supabase.rpc("get_unsent_alerts");

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("未送信アラート取得エラー:", error);
        }
        return [];
      }

      return (data || []).map(
        (alert: {
          alert_type: string;
          bottle_keep_id: string;
          customer_name: string;
          product_name: string;
          alert_message: string;
          expiry_date?: string;
          days_until_expiry?: number;
          remaining_amount?: number;
        }) => ({
          id: `${alert.alert_type}-${alert.bottle_keep_id}`,
          bottleKeepId: alert.bottle_keep_id,
          customerName: alert.customer_name,
          productName: alert.product_name,
          alertType: alert.alert_type as "expired" | "expiring" | "low_amount",
          severity:
            alert.alert_type === "expired" || alert.days_until_expiry <= 3
              ? "critical"
              : "warning",
          message: alert.alert_message,
          expiryDate: alert.expiry_date,
          daysUntilExpiry: alert.days_until_expiry,
          remainingAmount: alert.remaining_amount,
        })
      );
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("未送信アラート取得エラー:", error);
      }
      return [];
    }
  }
}

// Export singleton instance
export const bottleKeepService = new BottleKeepService();
