import { NextRequest, NextResponse } from "next/server";
import { PayrollService } from "@/services/payroll.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { castId, periodStart, periodEnd, save = false } = body;

    if (!castId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const calculation = await PayrollService.calculatePayroll(
      castId,
      new Date(periodStart),
      new Date(periodEnd)
    );

    let result: unknown = calculation;

    if (save) {
      const saved = await PayrollService.saveCalculation(calculation);
      result = { ...calculation, id: saved.id };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Payroll calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate payroll" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const castId = searchParams.get("castId") || undefined;
    const periodStart = searchParams.get("periodStart");
    const periodEnd = searchParams.get("periodEnd");

    const calculations = await PayrollService.getCalculations(
      castId,
      periodStart ? new Date(periodStart) : undefined,
      periodEnd ? new Date(periodEnd) : undefined
    );

    return NextResponse.json(calculations);
  } catch (error) {
    console.error("Failed to get payroll calculations:", error);
    return NextResponse.json(
      { error: "Failed to get payroll calculations" },
      { status: 500 }
    );
  }
}
