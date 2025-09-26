"use server";

import { createInventoryService } from "@/services/inventory.service";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// ========== Product Actions ==========

const getProductsSchema = z.object({
  category: z.string().optional(),
  searchTerm: z.string().optional(),
  isLowStock: z.boolean().optional(),
  isOutOfStock: z.boolean().optional(),
  sortBy: z.enum(["name", "stock", "lastUpdated"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const getProducts = createSafeAction(
  getProductsSchema,
  async (data, { supabase }) => {
    const service = createInventoryService(supabase);
    const products = await service.getProducts(data);
    return products;
  }
);

const getProductByIdSchema = z.object({
  id: z.number(),
});

export const getProductById = createSafeAction(
  getProductByIdSchema,
  async ({ id }, { supabase }) => {
    const service = createInventoryService(supabase);
    const product = await service.getProductById(id);
    if (!product) {
      throw new Error("商品が見つかりません");
    }
    return product;
  }
);

const createProductSchema = z.object({
  name: z.string().min(1, "商品名は必須です"),
  category: z.string().min(1, "カテゴリーは必須です"),
  price: z.number().min(0, "価格は0以上である必要があります"),
  cost: z.number().min(0, "原価は0以上である必要があります"),
  stock_quantity: z.number().min(0, "在庫数は0以上である必要があります"),
  low_stock_threshold: z.number().min(0),
  reorder_point: z.number().min(0),
  max_stock: z.number().min(0),
});

export const createProduct = createSafeAction(
  createProductSchema,
  async (data, { supabase }) => {
    const service = createInventoryService(supabase);
    const product = await service.createProduct(data);
    // Invalidate inventory-related views
    revalidatePath("/inventory");
    return product;
  }
);

const updateProductSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  stock_quantity: z.number().min(0).optional(),
  low_stock_threshold: z.number().min(0).optional(),
  reorder_point: z.number().min(0).optional(),
  max_stock: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const updateProduct = createSafeAction(
  updateProductSchema,
  async ({ id, ...data }, { supabase }) => {
    const service = createInventoryService(supabase);
    const product = await service.updateProduct(id, data);
    revalidatePath("/inventory");
    return product;
  }
);

const deleteProductSchema = z.object({
  id: z.number(),
});

export const deleteProduct = createSafeAction(
  deleteProductSchema,
  async ({ id }, { supabase }) => {
    const service = createInventoryService(supabase);
    await service.deleteProduct(id);
    revalidatePath("/inventory");
    return null;
  }
);

// ========== Inventory Movement Actions ==========

const createInventoryMovementSchema = z.object({
  productId: z.number(),
  movementType: z.enum(["in", "out", "adjustment"]),
  quantity: z.number().min(1, "数量は1以上である必要があります"),
  unitCost: z.number().min(0).optional(),
  reason: z.string().optional(),
  referenceId: z.string().optional(),
});

export const createInventoryMovement = createSafeAction(
  createInventoryMovementSchema,
  async (data, { supabase }) => {
    const service = createInventoryService(supabase);
    const movement = await service.createInventoryMovement(data);
    revalidatePath("/inventory");
    return movement;
  }
);

const getInventoryMovementsSchema = z.object({
  productId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  offset: z.number().optional(),
  limit: z.number().optional(),
});

export const getInventoryMovements = createSafeAction(
  getInventoryMovementsSchema,
  async ({ productId, startDate, endDate, offset, limit }, { supabase }) => {
    const service = createInventoryService(supabase);
    const movements = await service.getInventoryMovements(
      productId,
      startDate,
      endDate,
      offset,
      limit
    );
    return movements;
  }
);

const adjustInventorySchema = z.object({
  productId: z.number(),
  currentStock: z.number(),
  adjustedStock: z.number().min(0, "調整後の在庫数は0以上である必要があります"),
  reason: z.string().min(1, "調整理由は必須です"),
});

export const adjustInventory = createSafeAction(
  adjustInventorySchema,
  async (data, { supabase }) => {
    const service = createInventoryService(supabase);
    const movement = await service.adjustInventory(data);
    revalidatePath("/inventory");
    return movement;
  }
);

// ========== Statistics and Reports Actions ==========

export const getInventoryStats = createSafeAction(
  z.object({}),
  async (_, { supabase }) => {
    const service = createInventoryService(supabase);
    const stats = await service.getInventoryStats();
    return stats;
  }
);

export const getInventoryAlerts = createSafeAction(
  z.object({}),
  async (_, { supabase }) => {
    const service = createInventoryService(supabase);
    const alerts = await service.getInventoryAlerts();
    return alerts;
  }
);

const getInventoryReportSchema = z.object({
  productId: z.number(),
});

export const getInventoryReport = createSafeAction(
  getInventoryReportSchema,
  async ({ productId }, { supabase }) => {
    const service = createInventoryService(supabase);
    const report = await service.getInventoryReport(productId);
    return report;
  }
);

const getPeriodReportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export const getPeriodReport = createSafeAction(
  getPeriodReportSchema,
  async ({ startDate, endDate }, { supabase }) => {
    const service = createInventoryService(supabase);
    const report = await service.getPeriodReport(startDate, endDate);
    return report;
  }
);

export const getReorderSuggestions = createSafeAction(
  z.object({}),
  async (_, { supabase }) => {
    const service = createInventoryService(supabase);
    const suggestions = await service.getReorderSuggestions();
    return suggestions;
  }
);

export const getCategories = createSafeAction(
  z.object({}),
  async (_, { supabase }) => {
    const service = createInventoryService(supabase);
    const categories = await service.getCategories();
    return categories;
  }
);

// Optimized action to get all inventory page data in one query
const getInventoryPageDataSchema = z.object({
  category: z.string().optional(),
  searchTerm: z.string().optional(),
  offset: z.number().optional(),
  limit: z.number().optional(),
});

export const getInventoryPageData = createSafeAction(
  getInventoryPageDataSchema,
  async (filter, { supabase }) => {
    const service = createInventoryService(supabase);
    const data = await service.getInventoryPageData(filter);
    return data;
  }
);

// ========== Batch Operations ==========

const batchUpdateStockSchema = z.object({
  updates: z.array(
    z.object({
      productId: z.number(),
      quantity: z.number(),
      reason: z.string(),
    })
  ),
});

export const batchUpdateStock = createSafeAction(
  batchUpdateStockSchema,
  async ({ updates }, { supabase }) => {
    // batch update relies on server-side Supabase for each movement
    const service = createInventoryService(supabase);
    const results = await Promise.all(
      updates.map(({ productId, quantity, reason }) =>
        service.createInventoryMovement({
          productId,
          movementType: "adjustment",
          quantity,
          reason,
        })
      )
    );
    return results;
  }
);

// ========== Types for client-side use ==========

export type GetProductsInput = z.infer<typeof getProductsSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateInventoryMovementInput = z.infer<
  typeof createInventoryMovementSchema
>;
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
export type GetInventoryMovementsInput = z.infer<
  typeof getInventoryMovementsSchema
>;
export type GetPeriodReportInput = z.infer<typeof getPeriodReportSchema>;
export type BatchUpdateStockInput = z.infer<typeof batchUpdateStockSchema>;
