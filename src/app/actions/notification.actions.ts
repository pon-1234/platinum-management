"use server";

import { bottleKeepService } from "@/services/bottle-keep.service";
import { revalidatePath } from "next/cache";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";

/**
 * ボトルキープ期限アラートを送信
 */
export const sendBottleKeepExpiryAlerts = createSafeAction(
  z.object({}),
  async () => {
    const result = await bottleKeepService.sendExpiryAlerts();

    // 関連ページのキャッシュを無効化
    revalidatePath("/bottle-keep");
    revalidatePath("/dashboard");

    return result;
  }
);

/**
 * 未送信アラート一覧を取得
 */
export const getUnsentAlerts = createSafeAction(z.object({}), async () => {
  const alerts = await bottleKeepService.getUnsentAlerts();
  return alerts;
});

/**
 * 期限切れボトルのステータスを更新
 */
export const updateExpiredBottles = createSafeAction(z.object({}), async () => {
  const updatedCount = await bottleKeepService.updateExpiredBottles();

  // 関連ページのキャッシュを無効化
  revalidatePath("/bottle-keep");
  revalidatePath("/dashboard");

  return { updatedCount };
});
