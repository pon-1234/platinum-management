"use server";

import { createClient } from "@/lib/supabase/server";

export async function getUnregisteredStaff(
  page: number = 1,
  limit: number = 20,
  searchQuery?: string
) {
  const supabase = await createClient();

  try {
    // Server-side call with proper authentication context
    const { data, error } = await supabase.rpc("get_unregistered_staff", {
      p_page: page,
      p_limit: limit,
      p_search_query: searchQuery || null,
    });

    if (error) {
      console.error("Server-side error:", error);
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
  } catch (error) {
    console.error("Failed to get unregistered staff:", error);
    throw error instanceof Error
      ? error
      : new Error("未登録スタッフの取得に失敗しました");
  }
}
