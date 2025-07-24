import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "認証されていません" },
        { status: 401 }
      );
    }

    // Get all staff that are not already casts and not admin
    const { data: staffs, error } = await supabase
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
      .order("full_name");

    if (error) {
      console.error("Error fetching staffs:", error);
      return NextResponse.json(
        { error: "スタッフ情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    // Get all existing cast staff IDs
    const { data: casts, error: castsError } = await supabase
      .from("casts_profile")
      .select("staff_id");

    if (castsError) {
      console.error("Error fetching casts:", castsError);
      return NextResponse.json(
        { error: "キャスト情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    const castStaffIds = new Set(
      casts?.map((c) => c.staff_id).filter(Boolean) || []
    );

    // Filter out staff that are already casts
    const availableStaff =
      staffs?.filter((staff) => !castStaffIds.has(staff.id)) || [];

    const formattedStaff = availableStaff.map((staff) => ({
      id: staff.id,
      fullName: staff.full_name,
      role: staff.role,
      isActive: staff.is_active,
    }));

    return NextResponse.json(formattedStaff);
  } catch (error) {
    console.error("Unexpected error in available-staff API:", error);
    return NextResponse.json(
      { error: "予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}
