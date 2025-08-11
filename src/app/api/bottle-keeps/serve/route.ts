import { NextRequest, NextResponse } from "next/server";
import { BottleKeepService } from "@/services/bottle-keep.service";
import { serveBottleSchema } from "@/lib/validations/bottle-keep";
import { parseJsonOrThrow, ZodRequestError } from "@/lib/utils/api-validate";

// POST: ボトル提供（残量更新）
export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonOrThrow(serveBottleSchema, request);
    const bottle = await BottleKeepService.serveBottle(body);
    return NextResponse.json(bottle);
  } catch (error) {
    if (error instanceof ZodRequestError) {
      return NextResponse.json(
        { error: error.message, details: error.zodError.flatten() },
        { status: 400 }
      );
    }
    console.error("Failed to serve bottle:", error);
    return NextResponse.json(
      { error: "Failed to serve bottle" },
      { status: 500 }
    );
  }
}
