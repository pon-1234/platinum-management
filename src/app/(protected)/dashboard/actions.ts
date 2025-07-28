"use server";

import { createClient } from "@/lib/supabase/server";

export async function getDashboardStats() {
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
