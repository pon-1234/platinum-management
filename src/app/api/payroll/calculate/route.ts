import { NextRequest, NextResponse } from "next/server";
import { PayrollService } from "@/services/payroll.service";
import { z } from "zod";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import {
  parseJsonOrThrow,
  parseQueryOrThrow,
  ZodRequestError,
} from "@/lib/utils/api-validate";

const postSchema = z.object({
  castId: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  save: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const {
      castId,
      periodStart,
      periodEnd,
      save = false,
    } = await parseJsonOrThrow(postSchema, request);

    const supabase = await createServerSupabaseClient();
    const calculation = await PayrollService.calculatePayroll(
      castId,
      new Date(periodStart),
      new Date(periodEnd),
      supabase
    );

    let result: unknown = calculation;

    if (save) {
      const saved = await PayrollService.saveCalculation(
        calculation,
        "draft",
        supabase
      );
      result = { ...calculation, id: saved.id };
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodRequestError) {
      return NextResponse.json(
        { error: error.message, details: error.zodError.flatten() },
        { status: 400 }
      );
    }
    console.error("Payroll calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate payroll" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const getSchema = z.object({
      castId: z.string().uuid().optional(),
      periodStart: z.string().optional(),
      periodEnd: z.string().optional(),
    });

    const { castId, periodStart, periodEnd } = parseQueryOrThrow(
      getSchema,
      request
    );

    const supabase = await createServerSupabaseClient();
    const calculations = await PayrollService.getCalculations(
      castId,
      periodStart ? new Date(periodStart) : undefined,
      periodEnd ? new Date(periodEnd) : undefined,
      supabase
    );

    return NextResponse.json(calculations);
  } catch (error) {
    if (error instanceof ZodRequestError) {
      return NextResponse.json(
        { error: error.message, details: error.zodError.flatten() },
        { status: 400 }
      );
    }
    console.error("Failed to get payroll calculations:", error);
    return NextResponse.json(
      { error: "Failed to get payroll calculations" },
      { status: 500 }
    );
  }
}
