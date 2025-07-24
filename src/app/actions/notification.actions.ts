"use server";

import { bottleKeepService } from "@/services/bottle-keep.service";
import { revalidatePath } from "next/cache";

/**
 * ボトルキープ期限アラートを送信
 */
export async function sendBottleKeepExpiryAlerts() {
  try {
    const result = await bottleKeepService.sendExpiryAlerts();

    // 関連ページのキャッシュを無効化
    revalidatePath("/bottle-keep");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Alert sending action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 未送信アラート一覧を取得
 */
export async function getUnsentAlerts() {
  try {
    const alerts = await bottleKeepService.getUnsentAlerts();

    return {
      success: true,
      data: alerts,
    };
  } catch (error) {
    console.error("Get unsent alerts action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 期限切れボトルのステータスを更新
 */
export async function updateExpiredBottles() {
  try {
    const updatedCount = await bottleKeepService.updateExpiredBottles();

    // 関連ページのキャッシュを無効化
    revalidatePath("/bottle-keep");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { updatedCount },
    };
  } catch (error) {
    console.error("Update expired bottles action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
