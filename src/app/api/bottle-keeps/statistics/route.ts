import { NextRequest, NextResponse } from "next/server";
import { BottleKeepService } from "@/services/bottle-keep.service";
import { z } from "zod";

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
    const searchParams = request.nextUrl.searchParams;

    // クエリパラメータのバリデーション
    const queryValidation = statisticsQuerySchema.safeParse({
      type: searchParams.get("type"),
      customer_id: searchParams.get("customer_id"),
      start_date: searchParams.get("start_date"),
      end_date: searchParams.get("end_date"),
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

    const {
      type = "general",
      customer_id,
      start_date,
      end_date,
    } = queryValidation.data;

    let data;

    switch (type) {
      case "customer":
        if (!customer_id) {
          return NextResponse.json(
            { error: "customer_id is required for customer statistics" },
            { status: 400 }
          );
        }
        data = await BottleKeepService.getCustomerStatistics(customer_id);
        break;

      case "monthly":
        data = await BottleKeepService.getMonthlyStatistics(
          start_date,
          end_date
        );
        break;

      case "general":
      default:
        data = await BottleKeepService.getStatistics();
        break;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch bottle keep statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
