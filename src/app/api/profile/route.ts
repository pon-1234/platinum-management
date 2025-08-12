import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("Unauthorized profile access", "ProfileAPI");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff profile
    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("name, email, phone, created_at")
      .eq("user_id", user.id)
      .single();

    if (staffError && staffError.code !== "PGRST116") {
      logger.logDatabaseError(staffError, "select staff by user_id", "staffs");
      return NextResponse.json(
        { error: "Failed to fetch profile data" },
        { status: 500 }
      );
    }

    // Merge auth metadata and staff data
    const profile = {
      name:
        staff?.name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "",
      email: staff?.email || user.email || "",
      phone: staff?.phone || user.user_metadata?.phone || "",
      bio: user.user_metadata?.bio || "",
      created_at: staff?.created_at || user.created_at,
    };

    return NextResponse.json(profile);
  } catch (error) {
    logger.error("Profile API error", error, "ProfileAPI");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
