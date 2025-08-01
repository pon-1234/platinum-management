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
    const { data, error } = await supabase.rpc("get_recent_activities", {
      activity_limit: 10,
    });

    if (error) {
      console.error("Recent activities error:", error);
      throw new Error("最近の活動データの取得に失敗しました");
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
      throw new Error("時間帯別売上データの取得に失敗しました");
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
