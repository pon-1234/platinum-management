"use server";

import { bottleKeepService } from "@/services/bottle-keep.service";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";

// ========== BottleKeep Actions ==========

const getBottleKeepsSchema = z.object({
  customerId: z.string().optional(),
  productId: z.number().optional(),
  status: z.enum(["active", "expired", "consumed"]).optional(),
  storageLocation: z.string().optional(),
  expiringWithin: z.number().optional(),
  lowAmount: z.boolean().optional(),
  searchTerm: z.string().optional(),
  sortBy: z.enum(["expiryDate", "openedDate"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const getBottleKeeps = createSafeAction(
  getBottleKeepsSchema,
  async (filter) => {
    const bottleKeeps = await bottleKeepService.getBottleKeeps(filter);
    return bottleKeeps;
  }
);

const getBottleKeepByIdSchema = z.object({
  id: z.string(),
});

export const getBottleKeepById = createSafeAction(
  getBottleKeepByIdSchema,
  async ({ id }) => {
    const bottleKeep = await bottleKeepService.getBottleKeepById(id);
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
  async (data) => {
    const bottleKeep = await bottleKeepService.createBottleKeep(data);
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
  async ({ id, ...data }) => {
    const bottleKeep = await bottleKeepService.updateBottleKeep(id, {
      status: data.status,
      storage_location: data.storageLocation,
      expiry_date: data.expiryDate,
      remaining_amount: data.remainingAmount,
      notes: data.notes,
    });
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
  async (data) => {
    await bottleKeepService.useBottleKeep(data);
    return null;
  }
);

// ========== Statistics and Reports Actions ==========

export const getBottleKeepStats = createSafeAction(z.object({}), async () => {
  const stats = await bottleKeepService.getBottleKeepStats();
  return stats;
});

export const getBottleKeepAlerts = createSafeAction(z.object({}), async () => {
  const alerts = await bottleKeepService.getBottleKeepAlerts();
  return alerts;
});

const getCustomerBottleKeepSummarySchema = z.object({
  customerId: z.string(),
});

export const getCustomerBottleKeepSummary = createSafeAction(
  getCustomerBottleKeepSummarySchema,
  async ({ customerId }) => {
    const summary =
      await bottleKeepService.getCustomerBottleKeepSummary(customerId);
    return summary;
  }
);

export const getExpiryManagement = createSafeAction(z.object({}), async () => {
  const expiry = await bottleKeepService.getExpiryManagement();
  return expiry;
});

export const getBottleKeepInventory = createSafeAction(
  z.object({}),
  async () => {
    const inventory = await bottleKeepService.getBottleKeepInventory();
    return inventory;
  }
);

export const updateExpiredBottles = createSafeAction(z.object({}), async () => {
  const count = await bottleKeepService.updateExpiredBottles();
  return { updatedCount: count };
});

export const getStorageLocations = createSafeAction(z.object({}), async () => {
  const locations = await bottleKeepService.getStorageLocations();
  return locations;
});

// ========== Alert Actions ==========

export const sendExpiryAlerts = createSafeAction(z.object({}), async () => {
  const result = await bottleKeepService.sendExpiryAlerts();
  return {
    sentCount: result.sentCount,
    alerts: result.alerts,
  };
});

export const getUnsentAlerts = createSafeAction(z.object({}), async () => {
  const alerts = await bottleKeepService.getUnsentAlerts();
  return alerts;
});

// ========== Types for client-side use ==========

export type GetBottleKeepsInput = z.infer<typeof getBottleKeepsSchema>;
export type CreateBottleKeepInput = z.infer<typeof createBottleKeepSchema>;
export type UpdateBottleKeepInput = z.infer<typeof updateBottleKeepSchema>;
export type UseBottleKeepInput = z.infer<typeof useBottleKeepSchema>;
