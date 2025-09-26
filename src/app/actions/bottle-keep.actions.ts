"use server";

import { BottleKeepService } from "@/services/bottle-keep.service";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// ========== BottleKeep Actions ==========

const getBottleKeepsSchema = z.object({
  customerId: z.string().optional(),
  productId: z.number().optional(),
  status: z.enum(["active", "expired", "consumed"]).optional(),
  storageLocation: z.string().optional(),
  expiringWithin: z.number().optional(),
  lowAmount: z.boolean().optional(),
  searchTerm: z.string().optional(),
  sortBy: z
    .enum(["expiryDate", "openedDate", "customerName", "productName"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const getBottleKeeps = createSafeAction(
  getBottleKeepsSchema,
  async (filter, { supabase }) => {
    const bottleKeeps = await BottleKeepService.getBottleKeeps(
      filter.status,
      filter.customerId,
      supabase
    );
    return bottleKeeps;
  }
);

const getBottleKeepByIdSchema = z.object({
  id: z.string(),
});

export const getBottleKeepById = createSafeAction(
  getBottleKeepByIdSchema,
  async ({ id }, { supabase }) => {
    const bottleKeep = await BottleKeepService.getBottleKeep(id, supabase);
    if (!bottleKeep) {
      throw new Error("ボトルキープが見つかりません");
    }
    return bottleKeep;
  }
);

const createBottleKeepSchema = z.object({
  customerId: z.string(),
  productId: z.number(),
  openedDate: z.string(),
  expiryDate: z.string().optional(),
  bottleNumber: z.string().optional(),
  storageLocation: z.string().optional(),
  notes: z.string().optional(),
});

export const createBottleKeep = createSafeAction(
  createBottleKeepSchema,
  async (data, { supabase }) => {
    const bottleKeep = await BottleKeepService.createBottleKeep(
      {
        customer_id: data.customerId,
        product_id: String(data.productId),
        opened_date: data.openedDate,
        expiry_date: data.expiryDate,
        storage_location: data.storageLocation,
        notes: data.notes,
      },
      supabase
    );
    revalidatePath("/bottle-keep");
    return bottleKeep;
  }
);

const updateBottleKeepSchema = z.object({
  id: z.string(),
  status: z.enum(["active", "expired", "consumed"]).optional(),
  storageLocation: z.string().optional(),
  expiryDate: z.string().optional(),
  remainingAmount: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export const updateBottleKeep = createSafeAction(
  updateBottleKeepSchema,
  async ({ id, ...data }, { supabase }) => {
    const bottleKeep = await BottleKeepService.updateBottleKeep(
      id,
      {
        status: data.status,
        storage_location: data.storageLocation,
        remaining_percentage: data.remainingAmount,
        notes: data.notes,
      },
      supabase
    );
    revalidatePath("/bottle-keep");
    return bottleKeep;
  }
);

const useBottleKeepSchema = z.object({
  bottleKeepId: z.string(),
  visitId: z.string(),
  amountUsed: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export const useBottleKeep = createSafeAction(
  useBottleKeepSchema,
  async (data, { supabase }) => {
    await BottleKeepService.serveBottle(
      {
        bottle_keep_id: data.bottleKeepId,
        visit_id: data.visitId,
        served_amount: data.amountUsed,
        notes: data.notes,
      },
      supabase
    );
    revalidatePath("/bottle-keep");
    return null;
  }
);

// ========== Statistics and Reports Actions ==========

export const getBottleKeepStats = createSafeAction(
  z.object({}),
  async (_, { supabase }) => {
    const stats = await BottleKeepService.getStatistics(supabase);
    return stats;
  }
);

export const getBottleKeepAlerts = createSafeAction(z.object({}), async () => {
  // TODO: Implement getBottleKeepAlerts in BottleKeepService
  return [] as never[];
});

const getCustomerBottleKeepSummarySchema = z.object({
  customerId: z.string(),
});

export const getCustomerBottleKeepSummary = createSafeAction(
  getCustomerBottleKeepSummarySchema,
  async ({ customerId }, { supabase }) => {
    // TODO: Implement getCustomerBottleKeepSummary in BottleKeepService
    const summary = await BottleKeepService.getCustomerStatistics(
      customerId,
      supabase
    );
    return summary;
  }
);

export const getExpiryManagement = createSafeAction(z.object({}), async () => {
  // TODO: Implement getExpiryManagement in BottleKeepService
  const expiry = { expiring_soon: [] as never[], expired: [] as never[] };
  return expiry;
});

export const getBottleKeepInventory = createSafeAction(
  z.object({}),
  async () => {
    // TODO: Implement getBottleKeepInventory in BottleKeepService
    const inventory: never[] = [];
    return inventory;
  }
);

export const updateExpiredBottles = createSafeAction(
  z.object({}),
  async (_, { supabase }) => {
    const count = await BottleKeepService.updateExpiredBottles(supabase);
    return { updatedCount: count };
  }
);

export const getStorageLocations = createSafeAction(z.object({}), async () => {
  // TODO: Implement getStorageLocations in BottleKeepService
  const locations: string[] = [];
  return locations;
});

// ========== Alert Actions ==========

export const sendExpiryAlerts = createSafeAction(z.object({}), async () => {
  // TODO: Implement sendExpiryAlerts in BottleKeepService
  const result = { sent: 0, failed: 0 };
  return {
    sentCount: result.sent,
    alerts: [] as never[],
  };
});

export const getUnsentAlerts = createSafeAction(z.object({}), async () => {
  // TODO: Implement getUnsentAlerts in BottleKeepService
  const alerts: never[] = [];
  return alerts;
});

// ========== Types for client-side use ==========

export type GetBottleKeepsInput = z.infer<typeof getBottleKeepsSchema>;
export type CreateBottleKeepInput = z.infer<typeof createBottleKeepSchema>;
export type UpdateBottleKeepInput = z.infer<typeof updateBottleKeepSchema>;
export type UseBottleKeepInput = z.infer<typeof useBottleKeepSchema>;
