"use server";

import { inventoryService } from "@/services/inventory.service";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";

// ========== Product Actions ==========

const getProductsSchema = z.object({
  category: z.string().optional(),
  searchTerm: z.string().optional(),
  isLowStock: z.boolean().optional(),
  isOutOfStock: z.boolean().optional(),
  sortBy: z.enum(["name", "stock", "lastUpdated"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const getProducts = createSafeAction(getProductsSchema, async (data) => {
  const products = await inventoryService.getProducts(data);
  return products;
});

const getProductByIdSchema = z.object({
  id: z.number(),
});

export const getProductById = createSafeAction(
  getProductByIdSchema,
  async ({ id }) => {
    const product = await inventoryService.getProductById(id);
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
  async (data) => {
    const product = await inventoryService.createProduct(data);
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
  async ({ id, ...data }) => {
    const product = await inventoryService.updateProduct(id, data);
    return product;
  }
);

const deleteProductSchema = z.object({
  id: z.number(),
});

export const deleteProduct = createSafeAction(
  deleteProductSchema,
  async ({ id }) => {
    await inventoryService.deleteProduct(id);
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
  async (data) => {
    const movement = await inventoryService.createInventoryMovement(data);
    return movement;
  }
);

const getInventoryMovementsSchema = z.object({
  productId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const getInventoryMovements = createSafeAction(
  getInventoryMovementsSchema,
  async ({ productId, startDate, endDate }) => {
    const movements = await inventoryService.getInventoryMovements(
      productId,
      startDate,
      endDate
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
  async (data) => {
    const movement = await inventoryService.adjustInventory(data);
    return movement;
  }
);

// ========== Statistics and Reports Actions ==========

export const getInventoryStats = createSafeAction(z.object({}), async () => {
  const stats = await inventoryService.getInventoryStats();
  return stats;
});

export const getInventoryAlerts = createSafeAction(z.object({}), async () => {
  const alerts = await inventoryService.getInventoryAlerts();
  return alerts;
});

const getInventoryReportSchema = z.object({
  productId: z.number(),
});

export const getInventoryReport = createSafeAction(
  getInventoryReportSchema,
  async ({ productId }) => {
    const report = await inventoryService.getInventoryReport(productId);
    return report;
  }
);

const getPeriodReportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export const getPeriodReport = createSafeAction(
  getPeriodReportSchema,
  async ({ startDate, endDate }) => {
    const report = await inventoryService.getPeriodReport(startDate, endDate);
    return report;
  }
);

export const getReorderSuggestions = createSafeAction(
  z.object({}),
  async () => {
    const suggestions = await inventoryService.getReorderSuggestions();
    return suggestions;
  }
);

export const getCategories = createSafeAction(z.object({}), async () => {
  const categories = await inventoryService.getCategories();
  return categories;
});

// Optimized action to get all inventory page data in one query
const getInventoryPageDataSchema = z.object({
  category: z.string().optional(),
  searchTerm: z.string().optional(),
  offset: z.number().optional(),
  limit: z.number().optional(),
});

export const getInventoryPageData = createSafeAction(
  getInventoryPageDataSchema,
  async (filter) => {
    const data = await inventoryService.getInventoryPageData(filter);
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
  async ({ updates }) => {
    const results = await Promise.all(
      updates.map(({ productId, quantity, reason }) =>
        inventoryService.createInventoryMovement({
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
