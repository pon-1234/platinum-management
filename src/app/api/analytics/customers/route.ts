import { NextRequest, NextResponse } from "next/server";
import { CustomerAnalyticsService } from "@/services/customer-analytics.service";
import { z } from "zod";

// クエリパラメータのバリデーションスキーマ
const querySchema = z.object({
  type: z
    .enum([
      "metrics",
      "segments",
      "rfm",
      "summary",
      "at-risk",
      "vip",
      "cohort",
      "trends",
    ])
    .optional(),
  retention_status: z.enum(["active", "churning", "churned"]).optional(),
  segment: z.enum(["VIP", "Premium", "Regular", "New", "Prospect"]).optional(),
  risk_level: z
    .enum(["Lost", "High Risk", "Medium Risk", "Low Risk", "Healthy"])
    .optional(),
  min_visits: z.string().transform(Number).optional(),
  min_revenue: z.string().transform(Number).optional(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // クエリパラメータのバリデーション
    const queryValidation = querySchema.safeParse({
      type: searchParams.get("type"),
      retention_status: searchParams.get("retention_status"),
      segment: searchParams.get("segment"),
      risk_level: searchParams.get("risk_level"),
      min_visits: searchParams.get("min_visits"),
      min_revenue: searchParams.get("min_revenue"),
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

    const params = queryValidation.data;
    const type = params.type || "metrics";

    let data;

    switch (type) {
      case "metrics":
        data = await CustomerAnalyticsService.getCustomerMetrics({
          retention_status: params.retention_status,
          min_visits: params.min_visits,
          min_revenue: params.min_revenue,
        });
        break;

      case "segments":
        data = await CustomerAnalyticsService.getCustomerSegments({
          segment: params.segment,
          risk_level: params.risk_level,
        });
        break;

      case "rfm":
        data = await CustomerAnalyticsService.calculateRFMScores(
          params.start_date,
          params.end_date
        );
        break;

      case "summary":
        data = await CustomerAnalyticsService.getAnalyticsSummary();
        break;

      case "at-risk":
        data = await CustomerAnalyticsService.getAtRiskCustomers();
        break;

      case "vip":
        data = await CustomerAnalyticsService.getVIPCustomers();
        break;

      case "cohort":
        data = await CustomerAnalyticsService.getCohortAnalysis(
          params.start_date,
          params.end_date
        );
        break;

      case "trends":
        // Revenue trends will be handled in a separate endpoint
        data = { message: "Use /api/analytics/trends for trend analysis" };
        break;

      default:
        data = await CustomerAnalyticsService.getCustomerMetrics();
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch customer analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
