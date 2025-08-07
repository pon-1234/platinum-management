import { NextRequest, NextResponse } from "next/server";
import { BottleKeepService } from "@/services/bottle-keep.service";

// GET: ボトルキープ詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bottle = await BottleKeepService.getBottleKeep(params.id);

    if (!bottle) {
      return NextResponse.json(
        { error: "Bottle keep not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(bottle);
  } catch (error) {
    console.error("Failed to fetch bottle keep:", error);
    return NextResponse.json(
      { error: "Failed to fetch bottle keep" },
      { status: 500 }
    );
  }
}

// PUT: ボトルキープ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const bottle = await BottleKeepService.updateBottleKeep(params.id, body);
    return NextResponse.json(bottle);
  } catch (error) {
    console.error("Failed to update bottle keep:", error);
    return NextResponse.json(
      { error: "Failed to update bottle keep" },
      { status: 500 }
    );
  }
}
