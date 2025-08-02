"use server";

import { createClient } from "@/lib/supabase/server";

export interface AvailableStaff {
  id: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export async function getAvailableStaffAction(): Promise<{
  success: boolean;
  data?: AvailableStaff[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "認証されていません" };
    }

    // RPC関数を使用して、キャストではないスタッフを効率的に取得
    const { data, error } = await supabase.rpc("get_available_staff_for_cast");

    if (error) {
      // RPC関数が存在しない場合は、通常のクエリで取得
      if (error.code === "42883") {
        // Get all staff that are not already casts using LEFT JOIN
        const { data: staffs, error: queryError } = await supabase
          .from("staffs")
          .select(
            `
            id,
            full_name,
            role,
            is_active
          `
          )
          .neq("role", "admin")
          .eq("is_active", true)
          .is("casts_profile.staff_id", null)
          .order("full_name");

        if (queryError) {
          if (process.env.NODE_ENV === "development") {
            console.error("Error fetching available staff:", queryError);
          }
          return { success: false, error: "スタッフ情報の取得に失敗しました" };
        }

        const formattedStaff = (staffs || []).map((staff) => ({
          id: staff.id,
          fullName: staff.full_name,
          role: staff.role,
          isActive: staff.is_active,
        }));

        return { success: true, data: formattedStaff };
      }

      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching available staff:", error);
      }
      return { success: false, error: "スタッフ情報の取得に失敗しました" };
    }

    const formattedStaff = (data || []).map(
      (staff: {
        id: string;
        full_name: string;
        role: string;
        is_active: boolean;
      }) => ({
        id: staff.id,
        fullName: staff.full_name,
        role: staff.role,
        isActive: staff.is_active,
      })
    );

    return { success: true, data: formattedStaff };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Unexpected error in getAvailableStaffAction:", error);
    }
    return { success: false, error: "予期しないエラーが発生しました" };
  }
}
