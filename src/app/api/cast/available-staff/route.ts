// This API route has been migrated to Server Action
// Please use getAvailableStaffAction from @/app/actions/cast.actions.ts instead

import { NextResponse } from "next/server";
import { getAvailableStaffAction } from "@/app/actions/cast.actions";

export async function GET() {
  const result = await getAvailableStaffAction();

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "認証されていません" ? 401 : 500 }
    );
  }

  return NextResponse.json(result.data);
}
