import { NextRequest, NextResponse } from "next/server";

import { BottleKeepService } from "@/services/bottle-keep.service";
import {
  createBottleKeepSchema,
  getBottleKeepsQuerySchema,
} from "@/lib/validations/bottle-keep";
import {
  parseJsonOrThrow,
  parseQueryOrThrow,
  ZodRequestError,
} from "@/lib/utils/api-validate";

// GET: ボトルキープ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { status, customer_id } = parseQueryOrThrow(
      getBottleKeepsQuerySchema,
      request
    );
    const bottles = await BottleKeepService.getBottleKeeps(status, customer_id);

    return NextResponse.json(bottles);
  } catch (error) {
    if (error instanceof ZodRequestError) {
      return NextResponse.json(
        { error: error.message, details: error.zodError.flatten() },
        { status: 400 }
      );
    }
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
    const body = await parseJsonOrThrow(createBottleKeepSchema, request);
    const bottle = await BottleKeepService.createBottleKeep(body);
    return NextResponse.json(bottle, { status: 201 });
  } catch (error) {
    if (error instanceof ZodRequestError) {
      return NextResponse.json(
        { error: error.message, details: error.zodError.flatten() },
        { status: 400 }
      );
    }
    console.error("Failed to create bottle keep:", error);
    return NextResponse.json(
      { error: "Failed to create bottle keep" },
      { status: 500 }
    );
  }
}
