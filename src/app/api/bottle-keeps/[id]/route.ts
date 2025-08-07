import { NextRequest, NextResponse } from "next/server";
import { BottleKeepService } from "@/services/bottle-keep.service";
import { updateBottleKeepSchema } from "@/lib/validations/bottle-keep";
import { z } from "zod";

// パラメータのバリデーションスキーマ
const paramsSchema = z.object({
  id: z.string().uuid("有効なIDを指定してください"),
});

// GET: ボトルキープ詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // パラメータのバリデーション
    const paramsValidation = paramsSchema.safeParse(params);

    if (!paramsValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: paramsValidation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const bottle = await BottleKeepService.getBottleKeep(
      paramsValidation.data.id
    );

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
    // パラメータのバリデーション
    const paramsValidation = paramsSchema.safeParse(params);

    if (!paramsValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: paramsValidation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // リクエストボディのバリデーション
    const bodyValidation = updateBottleKeepSchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: bodyValidation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const bottle = await BottleKeepService.updateBottleKeep(
      paramsValidation.data.id,
      bodyValidation.data
    );
    return NextResponse.json(bottle);
  } catch (error) {
    console.error("Failed to update bottle keep:", error);
    return NextResponse.json(
      { error: "Failed to update bottle keep" },
      { status: 500 }
    );
  }
}
