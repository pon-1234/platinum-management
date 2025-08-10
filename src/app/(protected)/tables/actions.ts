"use server";

import { revalidatePath } from "next/cache";
import { VisitSessionServerService } from "@/services/visit-session.server";

export async function checkInAction(
  tableId: string,
  customerId: string,
  numGuests: number = 1
): Promise<{ success: boolean; error?: string; visitId?: string }> {
  try {
    // テーブルIDを数値に変換
    const tableIdNumber = parseInt(tableId, 10);
    if (isNaN(tableIdNumber)) {
      throw new Error("無効なテーブルIDです");
    }

    const { visitId } = await VisitSessionServerService.createSession(
      tableIdNumber,
      customerId,
      numGuests
    );

    revalidatePath("/tables");
    return { success: true, visitId };
  } catch (error) {
    console.error("Check-in failed:", error);
    const message =
      error instanceof Error ? error.message : "来店受付に失敗しました";
    return { success: false, error: message };
  }
}

export async function checkOutAction(
  visitId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await VisitSessionServerService.endSession(visitId);

    revalidatePath("/tables");
    return { success: true };
  } catch (error) {
    console.error("Check-out failed:", error);
    const message =
      error instanceof Error ? error.message : "チェックアウトに失敗しました";
    return { success: false, error: message };
  }
}

export async function moveTableAction(
  visitId: string,
  newTableId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const newTableIdNumber = parseInt(newTableId, 10);
    if (isNaN(newTableIdNumber)) {
      throw new Error("無効なテーブルIDです");
    }
    await VisitSessionServerService.moveTable(visitId, newTableIdNumber);

    revalidatePath("/tables");
    return { success: true };
  } catch (error) {
    console.error("Table move failed:", error);
    const message =
      error instanceof Error ? error.message : "テーブル移動に失敗しました";
    return { success: false, error: message };
  }
}
