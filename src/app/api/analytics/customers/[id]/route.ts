import { NextRequest, NextResponse } from "next/server";
import { CustomerAnalyticsService } from "@/services/customer-analytics.service";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { parseQueryOrThrow, ZodRequestError } from "@/lib/utils/api-validate";

// パラメータのバリデーションスキーマ
const paramsSchema = z.object({
  id: z.string().uuid("有効な顧客IDを指定してください"),
});

// クエリパラメータのバリデーションスキーマ
const querySchema = z.object({
  type: z
    .enum([
      "metrics",
      "lifetime-value",
      "churn-score",
      "trends",
      "engagement",
      "recommendations",
    ])
    .optional(),
  months: z.string().transform(Number).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // パラメータのバリデーション
    const paramsValidation = paramsSchema.safeParse({ id });

    if (!paramsValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: paramsValidation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const customerId = paramsValidation.data.id;
    const { type = "metrics", months = 6 } = parseQueryOrThrow(
      querySchema,
      request
    );

    let data;
    const supabase = await createClient();

    switch (type) {
      case "metrics":
        data = await CustomerAnalyticsService.getCustomerMetric(
          customerId,
          supabase
        );
        if (!data) {
          return NextResponse.json(
            { error: "Customer not found" },
            { status: 404 }
          );
        }
        break;

      case "lifetime-value":
        data = await CustomerAnalyticsService.calculateLifetimeValue(
          customerId,
          supabase
        );
        break;

      case "churn-score":
        const score = await CustomerAnalyticsService.calculateChurnScore(
          customerId,
          supabase
        );
        data = {
          customer_id: customerId,
          churn_score: score,
          risk_level: score >= 70 ? "High" : score >= 40 ? "Medium" : "Low",
        };
        break;

      case "trends":
        data = await CustomerAnalyticsService.getCustomerTrends(
          customerId,
          months,
          supabase
        );
        break;

      case "engagement":
        const { data: engagementScore } = await supabase.rpc(
          "calculate_engagement_score",
          { p_customer_id: customerId }
        );
        data = {
          customer_id: customerId,
          engagement_score: engagementScore || 0,
        };
        break;

      case "recommendations":
        const { data: recommendations } = await supabase.rpc(
          "get_customer_recommendations",
          { p_customer_id: customerId }
        );
        data = recommendations;
        break;

      default:
        data = await CustomerAnalyticsService.getCustomerMetric(
          customerId,
          supabase
        );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodRequestError) {
      return NextResponse.json(
        { error: error.message, details: error.zodError.flatten() },
        { status: 400 }
      );
    }
    console.error("Failed to fetch customer analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer data" },
      { status: 500 }
    );
  }
}
