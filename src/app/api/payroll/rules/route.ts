import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 型定義
interface SlideRule {
  minSales: number;
  maxSales?: number;
  backPercentage: number;
}

interface BackRule {
  category: string;
  backPercentage: number;
  minAmount?: number;
  maxAmount?: number;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payroll_rules")
      .select(
        `
        *,
        payroll_slide_rules(*),
        payroll_back_rules(*)
      `
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch payroll rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll rules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ruleName,
      description,
      baseHourlyRate,
      baseBackPercentage,
      effectiveFrom,
      effectiveUntil,
      slideRules = [],
      backRules = [],
    } = body;

    // 給与ルールを作成
    const supabase = await createClient();
    const { data: rule, error: ruleError } = await supabase
      .from("payroll_rules")
      .insert({
        rule_name: ruleName,
        description,
        base_hourly_rate: baseHourlyRate,
        base_back_percentage: baseBackPercentage,
        effective_from: effectiveFrom,
        effective_until: effectiveUntil,
        is_active: true,
      })
      .select()
      .single();

    if (ruleError) throw ruleError;

    // 売上スライドルールを作成
    if (slideRules.length > 0) {
      const slideRulesData = slideRules.map((slide: SlideRule) => ({
        rule_id: rule.id,
        min_sales: slide.minSales,
        max_sales: slide.maxSales,
        back_percentage: slide.backPercentage,
      }));

      const { error: slideError } = await supabase
        .from("payroll_slide_rules")
        .insert(slideRulesData);

      if (slideError) throw slideError;
    }

    // 項目別バックルールを作成
    if (backRules.length > 0) {
      const backRulesData = backRules.map((back: BackRule) => ({
        rule_id: rule.id,
        category: back.category,
        back_percentage: back.backPercentage,
        min_amount: back.minAmount,
        max_amount: back.maxAmount,
      }));

      const { error: backError } = await supabase
        .from("payroll_back_rules")
        .insert(backRulesData);

      if (backError) throw backError;
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error("Failed to create payroll rule:", error);
    return NextResponse.json(
      { error: "Failed to create payroll rule" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Rule ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payroll_rules")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to update payroll rule:", error);
    return NextResponse.json(
      { error: "Failed to update payroll rule" },
      { status: 500 }
    );
  }
}
