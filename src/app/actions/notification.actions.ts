"use server";

import { BottleKeepService } from "@/services/bottle-keep.service";
import { revalidatePath } from "next/cache";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";

/**
 * ボトルキープ期限アラートを送信
 */
export const sendBottleKeepExpiryAlerts = createSafeAction(
  z.object({}),
  async () => {
    // TODO: Implement sendExpiryAlerts in BottleKeepService
    const result = { sent: 0, failed: 0 };

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
  // TODO: Implement getUnsentAlerts in BottleKeepService
  const alerts: never[] = [];
  return alerts;
});

/**
 * 期限切れボトルのステータスを更新
 */
export const updateExpiredBottles = createSafeAction(
  z.object({}),
  async (_, { supabase }) => {
    await BottleKeepService.updateExpiredBottles(supabase);
    const updatedCount = 0;

  // 関連ページのキャッシュを無効化
  revalidatePath("/bottle-keep");
  revalidatePath("/dashboard");

  return { updatedCount };
  }
);
