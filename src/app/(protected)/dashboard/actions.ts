"use server";

import { createClient } from "@/lib/supabase/server";

export async function getDashboardStats() {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // Use optimized RPC function to get all dashboard stats in one query
    const { data, error } = await supabase.rpc("get_dashboard_stats", {
      report_date: today,
    });

    if (error) {
      // Fallback to individual queries if RPC doesn't exist
      if (error.message.includes("function get_dashboard_stats")) {
        return getDashboardStatsFallback();
      }
      console.error("Dashboard stats RPC error:", error);
      throw new Error("ダッシュボードデータの取得に失敗しました");
    }

    return {
      success: true,
      data: {
        totalCustomers: Number(data.today_customers) || 0,
        todayReservations: Number(data.pending_reservations) || 0,
        todaySales: Number(data.today_sales) || 0,
        todayVisits: Number(data.today_visits) || 0,
        todayNewCustomers: Number(data.today_new_customers) || 0,
        activeCastCount: Number(data.active_cast_count) || 0,
        activeTableCount: Number(data.active_table_count) || 0,
        lowStockCount: Number(data.low_stock_count) || 0,
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

// Fallback function for backward compatibility
async function getDashboardStatsFallback() {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // Get total customers count
    const { count: totalCustomers, error: customerError } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false);

    if (customerError) {
      console.error("Customer count error:", customerError);
      throw new Error("顧客数の取得に失敗しました");
    }

    // Get today's reservations count
    const { count: todayReservations, error: reservationError } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("reservation_date", today)
      .neq("status", "cancelled");

    if (reservationError) {
      console.error("Reservation count error:", reservationError);
      throw new Error("予約数の取得に失敗しました");
    }

    // Get today's sales using visits and order_items
    const { data: todayVisits, error: visitsError } = await supabase
      .from("visits")
      .select("id")
      .gte("check_in_at", `${today}T00:00:00`)
      .lt("check_in_at", `${today}T23:59:59`)
      .eq("status", "completed");

    if (visitsError) {
      console.error("Visits error:", visitsError);
      throw new Error("来店データの取得に失敗しました");
    }

    let todaySales = 0;
    if (todayVisits && todayVisits.length > 0) {
      const visitIds = todayVisits.map((v) => v.id);

      const { data: orderItems, error: orderError } = await supabase
        .from("order_items")
        .select("total_price")
        .in("visit_id", visitIds);

      if (orderError) {
        console.error("Order items error:", orderError);
        // Don't throw here, just log and continue with 0 sales
      } else if (orderItems) {
        todaySales = orderItems.reduce(
          (sum, item) => sum + (item.total_price || 0),
          0
        );
      }
    }

    return {
      success: true,
      data: {
        totalCustomers: totalCustomers || 0,
        todayReservations: todayReservations || 0,
        todaySales: todaySales || 0,
      },
    };
  } catch (error) {
    console.error("Dashboard stats fallback error:", error);
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
