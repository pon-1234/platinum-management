"use server";

import { createClient } from "@/lib/supabase/server";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";

export const getAvailableStaffForCast = createSafeAction(
  z.object({}),
  async () => {
    const supabase = createClient();

    // Get all staff that are not already casts and not admin
    const { data: staffs, error } = await supabase
      .from("staffs")
      .select(
        `
        id,
        full_name,
        full_name_kana,
        role,
        status
      `
      )
      .neq("role", "admin")
      .eq("status", "active")
      .order("full_name_kana");

    if (error) {
      throw new Error("スタッフ情報の取得に失敗しました");
    }

    // Get all existing cast staff IDs
    const { data: casts } = await supabase
      .from("casts_profile")
      .select("staff_id");

    const castStaffIds = new Set(casts?.map((c) => c.staff_id) || []);

    // Filter out staff that are already casts
    const availableStaff =
      staffs?.filter((staff) => !castStaffIds.has(staff.id)) || [];

    return availableStaff.map((staff) => ({
      id: staff.id,
      fullName: staff.full_name,
      fullNameKana: staff.full_name_kana,
      role: staff.role,
      status: staff.status,
    }));
  }
);

const getUnregisteredStaffSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  searchQuery: z.string().optional(),
});

export const getUnregisteredStaff = createSafeAction(
  getUnregisteredStaffSchema,
  async ({ page, limit, searchQuery }) => {
    const supabase = createClient();

    // Server-side call with proper authentication context
    const { data, error } = await supabase.rpc("get_unregistered_staff", {
      p_page: page,
      p_limit: limit,
      p_search_query: searchQuery || null,
    });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Server-side error:", error);
      }
      throw new Error(`未登録スタッフの取得に失敗しました: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return { data: [], totalCount: 0, hasMore: false };
    }

    // Extract total count and hasMore from the first row
    const totalCount = data[0].total_count || 0;
    const hasMore = data[0].has_more || false;

    // Map the data to Staff type
    const staffList = data.map((item: Record<string, unknown>) => ({
      id: item.id,
      userId: item.user_id,
      fullName: item.full_name,
      role: item.role,
      hireDate: item.hire_date,
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return { data: staffList, totalCount, hasMore };
  }
);
