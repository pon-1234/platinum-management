import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BottleKeepService } from "@/services/bottle-keep.service";
import {
  createBottleKeepSchema,
  getBottleKeepsQuerySchema,
} from "@/lib/validations/bottle-keep";
import { z } from "zod";

// GET: ボトルキープ一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // クエリパラメータのバリデーション
    const queryValidation = getBottleKeepsQuerySchema.safeParse({
      status: searchParams.get("status"),
      customer_id: searchParams.get("customer_id"),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: queryValidation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { status, customer_id } = queryValidation.data;
    const bottles = await BottleKeepService.getBottleKeeps(status, customer_id);

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

    // リクエストボディのバリデーション
    const validation = createBottleKeepSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const bottle = await BottleKeepService.createBottleKeep(validation.data);
    return NextResponse.json(bottle, { status: 201 });
  } catch (error) {
    console.error("Failed to create bottle keep:", error);
    return NextResponse.json(
      { error: "Failed to create bottle keep" },
      { status: 500 }
    );
  }
}
