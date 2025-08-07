import { NextRequest, NextResponse } from "next/server";
import { BottleKeepService } from "@/services/bottle-keep.service";
import { serveBottleSchema } from "@/lib/validations/bottle-keep";

// POST: ボトル提供（残量更新）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // リクエストボディのバリデーション
    const validation = serveBottleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const bottle = await BottleKeepService.serveBottle(validation.data);
    return NextResponse.json(bottle);
  } catch (error) {
    console.error("Failed to serve bottle:", error);
    return NextResponse.json(
      { error: "Failed to serve bottle" },
      { status: 500 }
    );
  }
}
