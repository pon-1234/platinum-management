import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BottleKeepService } from "@/services/bottle-keep.service";

// GET: ボトルキープ一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as
      | "active"
      | "consumed"
      | "expired"
      | "removed"
      | null;
    const customer_id = searchParams.get("customer_id");

    const bottles = await BottleKeepService.getBottleKeeps(
      status || undefined,
      customer_id || undefined
    );

    return NextResponse.json(bottles);
  } catch (error) {
    console.error("Failed to fetch bottle keeps:", error);
    return NextResponse.json(
      { error: "Failed to fetch bottle keeps" },
      { status: 500 }
    );
  }
}

// POST: 新規ボトルキープ作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bottle = await BottleKeepService.createBottleKeep(body);
    return NextResponse.json(bottle, { status: 201 });
  } catch (error) {
    console.error("Failed to create bottle keep:", error);
    return NextResponse.json(
      { error: "Failed to create bottle keep" },
      { status: 500 }
    );
  }
}
