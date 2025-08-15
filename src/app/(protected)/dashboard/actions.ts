"use server";

import { createClient } from "@/lib/supabase/server";

export async function getDashboardStats() {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // Use optimized RPC function to get all dashboard stats in one query
    const { data, error } = await supabase.rpc(
      "get_optimized_dashboard_stats",
      {
        report_date: today,
      }
    );

    if (error) {
      console.error("Dashboard stats RPC error:", error);
      throw new Error(
        error.code === "42883"
          ? "Required database function is missing. Please run migrations."
          : "ダッシュボードデータの取得に失敗しました"
      );
    }

    // RPCがTABLEを返すので、結果は配列。最初の要素を取得する。
    const stats = data?.[0];

    if (!stats) {
      // データがない場合はデフォルト値を返す
      return {
        success: true,
        data: {
          totalCustomers: 0,
          todayReservations: 0,
          todaySales: 0,
          todayVisits: 0,
          todayNewCustomers: 0,
          activeCastCount: 0,
          activeTableCount: 0,
          lowStockCount: 0,
        },
      };
    }

    return {
      success: true,
      data: {
        totalCustomers: Number(stats.today_customers) || 0,
        todayReservations: Number(stats.today_reservations) || 0,
        todaySales: Number(stats.today_sales) || 0,
        todayVisits: Number(stats.today_visits) || 0,
        todayNewCustomers: Number(stats.today_new_customers) || 0,
        activeCastCount: Number(stats.active_cast_count) || 0,
        activeTableCount: Number(stats.active_tables) || 0,
        lowStockCount: Number(stats.low_stock_count) || 0,
      },
    };
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "ダッシュボードデータの取得に失敗しました",
    };
  }
}

// Get recent activities optimized
export async function getRecentActivities() {
  try {
    const supabase = await createClient();

    // Use optimized RPC function
    // get_recent_activities が未導入な環境向けにフォールバック
    const { data, error } = await supabase.rpc("get_recent_activities", {
      activity_limit: 10,
    });

    if (error) {
      console.error("Recent activities error:", error);
      // Fallback: 最近の order_items / visits / reservations から簡易ログを生成
      try {
        const [orders, visits, reservations] = await Promise.all([
          supabase
            .from("order_items")
            .select("created_at, total_price")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("visits")
            .select("created_at, status")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("reservations")
            .select("created_at, status")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);
        const act = [
          ...(orders.data || []).map((o) => ({
            type: "order",
            created_at: o.created_at,
            message: `注文明細 ¥${Number(o.total_price || 0).toLocaleString()}`,
          })),
          ...(visits.data || []).map((v) => ({
            type: "visit",
            created_at: v.created_at,
            message: `来店 ${v.status}`,
          })),
          ...(reservations.data || []).map((r) => ({
            type: "reservation",
            created_at: r.created_at,
            message: `予約 ${r.status}`,
          })),
        ]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 10);

        return { success: true, data: act };
      } catch (e) {
        return { success: true, data: [] };
      }
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error("Recent activities error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "最近の活動データの取得に失敗しました",
    };
  }
}

// Get hourly sales data
export async function getHourlySales() {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase.rpc("get_hourly_sales", {
      report_date: today,
    });

    if (error) {
      console.error("Hourly sales error:", error);
      // Fallback: visits/order_items から簡易集計
      try {
        const { data: rows } = await supabase
          .from("order_items")
          .select("created_at, total_price")
          .gte("created_at", `${today}T00:00:00.000Z`)
          .lte("created_at", `${today}T23:59:59.999Z`);
        const buckets = new Map<string, number>();
        (rows || []).forEach((r) => {
          const h = new Date(r.created_at).toISOString().slice(11, 13);
          buckets.set(h, (buckets.get(h) || 0) + Number(r.total_price || 0));
        });
        const series = Array.from({ length: 24 }).map((_, i) => ({
          hour: `${String(i).padStart(2, "0")}:00`,
          amount: buckets.get(String(i).padStart(2, "0")) || 0,
        }));
        return { success: true, data: series };
      } catch (e) {
        return { success: true, data: [] };
      }
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error("Hourly sales error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "時間帯別売上データの取得に失敗しました",
    };
  }
}

// KPI trends: today vs yesterday and same weekday last week
export async function getKpiTrends() {
  try {
    const supabase = await createClient();

    const startOfDayIso = (d: Date) => {
      const copy = new Date(d);
      copy.setUTCHours(0, 0, 0, 0);
      return copy.toISOString();
    };
    const endOfDayIso = (d: Date) => {
      const copy = new Date(d);
      copy.setUTCHours(23, 59, 59, 999);
      return copy.toISOString();
    };

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    const ranges = {
      today: { from: startOfDayIso(today), to: endOfDayIso(today) },
      d1: { from: startOfDayIso(yesterday), to: endOfDayIso(yesterday) },
      dow: { from: startOfDayIso(lastWeek), to: endOfDayIso(lastWeek) },
    } as const;

    const fetchSalesSum = async (from: string, to: string) => {
      const { data, error } = await supabase
        .from("order_items")
        .select("total_price, created_at")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) return 0;
      return (data || []).reduce(
        (sum, r: any) => sum + Number(r.total_price || 0),
        0
      );
    };

    const fetchReservationCount = async (from: string, to: string) => {
      const { count, error } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) return 0;
      return Number(count || 0);
    };

    const [salesToday, salesD1, salesDow, resToday, resD1, resDow] =
      await Promise.all([
        fetchSalesSum(ranges.today.from, ranges.today.to),
        fetchSalesSum(ranges.d1.from, ranges.d1.to),
        fetchSalesSum(ranges.dow.from, ranges.dow.to),
        fetchReservationCount(ranges.today.from, ranges.today.to),
        fetchReservationCount(ranges.d1.from, ranges.d1.to),
        fetchReservationCount(ranges.dow.from, ranges.dow.to),
      ]);

    const delta = (current: number, base: number) =>
      base > 0 ? (current / base - 1) * 100 : null;

    return {
      success: true,
      data: {
        sales: {
          today: salesToday,
          d1: delta(salesToday, salesD1),
          dow: delta(salesToday, salesDow),
        },
        reservations: {
          today: resToday,
          d1: delta(resToday, resD1),
          dow: delta(resToday, resDow),
        },
      },
    };
  } catch (error) {
    console.error("KPI trends error:", error);
    return { success: false, error: "KPIトレンドの取得に失敗しました" };
  }
}
