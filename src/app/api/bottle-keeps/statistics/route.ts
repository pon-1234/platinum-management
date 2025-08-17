import { NextRequest, NextResponse } from "next/server";
import { BottleKeepService } from "@/services/bottle-keep.service";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";
import { parseQueryOrThrow, ZodRequestError } from "@/lib/utils/api-validate";

// クエリパラメータのバリデーションスキーマ
const statisticsQuerySchema = z.object({
  type: z.enum(["general", "customer", "monthly"]).optional(),
  customer_id: z.string().uuid().optional(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// GET: 統計情報取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      type = "general",
      customer_id,
      start_date,
      end_date,
    } = parseQueryOrThrow(statisticsQuerySchema, request);

    let data;

    switch (type) {
      case "customer":
        if (!customer_id) {
          return NextResponse.json(
            { error: "customer_id is required for customer statistics" },
            { status: 400 }
          );
        }
        data = await BottleKeepService.getCustomerStatistics(
          customer_id,
          supabase
        );
        break;

      case "monthly":
        data = await BottleKeepService.getMonthlyStatistics(
          start_date,
          end_date,
          supabase
        );
        break;

      case "general":
      default:
        data = await BottleKeepService.getStatistics(supabase);
        break;
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodRequestError) {
      return NextResponse.json(
        { error: error.message, details: error.zodError.flatten() },
        { status: 400 }
      );
    }
    console.error("Failed to fetch bottle keep statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
