"use server";

import { bottleKeepService } from "@/services/bottle-keep.service";
import { authenticatedAction } from "@/lib/actions";
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

export const getBottleKeeps = authenticatedAction(
  getBottleKeepsSchema,
  async (filter: z.infer<typeof getBottleKeepsSchema>) => {
    const bottleKeeps = await bottleKeepService.getBottleKeeps(filter);
    return { success: true, data: bottleKeeps };
  }
);

const getBottleKeepByIdSchema = z.object({
  id: z.string(),
});

export const getBottleKeepById = authenticatedAction(
  getBottleKeepByIdSchema,
  async ({ id }) => {
    const bottleKeep = await bottleKeepService.getBottleKeepById(id);
    if (!bottleKeep) {
      return { success: false, error: "ボトルキープが見つかりません" };
    }
    return { success: true, data: bottleKeep };
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

export const createBottleKeep = authenticatedAction(
  createBottleKeepSchema,
  async (data: z.infer<typeof createBottleKeepSchema>) => {
    const bottleKeep = await bottleKeepService.createBottleKeep(data);
    return { success: true, data: bottleKeep };
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

export const updateBottleKeep = authenticatedAction(
  updateBottleKeepSchema,
  async ({ id, ...data }) => {
    const bottleKeep = await bottleKeepService.updateBottleKeep(id, {
      status: data.status,
      storage_location: data.storageLocation,
      expiry_date: data.expiryDate,
      remaining_amount: data.remainingAmount,
      notes: data.notes,
    });
    return { success: true, data: bottleKeep };
  }
);

const useBottleKeepSchema = z.object({
  bottleKeepId: z.string(),
  visitId: z.string(),
  amountUsed: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export const useBottleKeep = authenticatedAction(
  useBottleKeepSchema,
  async (data: z.infer<typeof useBottleKeepSchema>) => {
    await bottleKeepService.useBottleKeep(data);
    return { success: true };
  }
);

// ========== Statistics and Reports Actions ==========

export const getBottleKeepStats = authenticatedAction(
  z.object({}),
  async () => {
    const stats = await bottleKeepService.getBottleKeepStats();
    return { success: true, data: stats };
  }
);

export const getBottleKeepAlerts = authenticatedAction(
  z.object({}),
  async () => {
    const alerts = await bottleKeepService.getBottleKeepAlerts();
    return { success: true, data: alerts };
  }
);

const getCustomerBottleKeepSummarySchema = z.object({
  customerId: z.string(),
});

export const getCustomerBottleKeepSummary = authenticatedAction(
  getCustomerBottleKeepSummarySchema,
  async ({ customerId }) => {
    const summary =
      await bottleKeepService.getCustomerBottleKeepSummary(customerId);
    return { success: true, data: summary };
  }
);

export const getExpiryManagement = authenticatedAction(
  z.object({}),
  async () => {
    const expiry = await bottleKeepService.getExpiryManagement();
    return { success: true, data: expiry };
  }
);

export const getBottleKeepInventory = authenticatedAction(
  z.object({}),
  async () => {
    const inventory = await bottleKeepService.getBottleKeepInventory();
    return { success: true, data: inventory };
  }
);

export const updateExpiredBottles = authenticatedAction(
  z.object({}),
  async () => {
    const count = await bottleKeepService.updateExpiredBottles();
    return { success: true, data: { updatedCount: count } };
  }
);

export const getStorageLocations = authenticatedAction(
  z.object({}),
  async () => {
    const locations = await bottleKeepService.getStorageLocations();
    return { success: true, data: locations };
  }
);

// ========== Alert Actions ==========

export const sendExpiryAlerts = authenticatedAction(z.object({}), async () => {
  const result = await bottleKeepService.sendExpiryAlerts();
  return {
    success: result.success,
    data: {
      sentCount: result.sentCount,
      alerts: result.alerts,
    },
  };
});

export const getUnsentAlerts = authenticatedAction(z.object({}), async () => {
  const alerts = await bottleKeepService.getUnsentAlerts();
  return { success: true, data: alerts };
});

// ========== Types for client-side use ==========

export type GetBottleKeepsInput = z.infer<typeof getBottleKeepsSchema>;
export type CreateBottleKeepInput = z.infer<typeof createBottleKeepSchema>;
export type UpdateBottleKeepInput = z.infer<typeof updateBottleKeepSchema>;
export type UseBottleKeepInput = z.infer<typeof useBottleKeepSchema>;
