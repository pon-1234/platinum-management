import { NextRequest, NextResponse } from "next/server";
import { BottleKeepService } from "@/services/bottle-keep.service";

// POST: ボトル提供（残量更新）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bottle = await BottleKeepService.serveBottle(body);
    return NextResponse.json(bottle);
  } catch (error) {
    console.error("Failed to serve bottle:", error);
    return NextResponse.json(
      { error: "Failed to serve bottle" },
      { status: 500 }
    );
  }
}
