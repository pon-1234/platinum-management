"use server";

import { inventoryService } from "@/services/inventory.service";
import { authenticatedAction } from "@/lib/actions";
import { z } from "zod";
import type {
  Product,
  InventoryMovement,
  InventoryStats,
  InventoryAlert,
  InventoryReport,
  PeriodInventoryReport,
  ReorderSuggestion,
} from "@/types/inventory.types";

// ========== Product Actions ==========

const getProductsSchema = z.object({
  category: z.string().optional(),
  searchTerm: z.string().optional(),
  isLowStock: z.boolean().optional(),
  isOutOfStock: z.boolean().optional(),
  sortBy: z.enum(["name", "stock", "lastUpdated"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const getProducts = authenticatedAction(
  getProductsSchema,
  async (data) => {
    const products = await inventoryService.getProducts(data);
    return { success: true, data: products };
  }
);

const getProductByIdSchema = z.object({
  id: z.number(),
});

export const getProductById = authenticatedAction(
  getProductByIdSchema,
  async ({ id }) => {
    const product = await inventoryService.getProductById(id);
    if (!product) {
      return { success: false, error: "商品が見つかりません" };
    }
    return { success: true, data: product };
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

export const createProduct = authenticatedAction(
  createProductSchema,
  async (data) => {
    const product = await inventoryService.createProduct(data);
    return { success: true, data: product };
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

export const updateProduct = authenticatedAction(
  updateProductSchema,
  async ({ id, ...data }) => {
    const product = await inventoryService.updateProduct(id, data);
    return { success: true, data: product };
  }
);

const deleteProductSchema = z.object({
  id: z.number(),
});

export const deleteProduct = authenticatedAction(
  deleteProductSchema,
  async ({ id }) => {
    await inventoryService.deleteProduct(id);
    return { success: true };
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

export const createInventoryMovement = authenticatedAction(
  createInventoryMovementSchema,
  async (data) => {
    const movement = await inventoryService.createInventoryMovement(data);
    return { success: true, data: movement };
  }
);

const getInventoryMovementsSchema = z.object({
  productId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const getInventoryMovements = authenticatedAction(
  getInventoryMovementsSchema,
  async ({ productId, startDate, endDate }) => {
    const movements = await inventoryService.getInventoryMovements(
      productId,
      startDate,
      endDate
    );
    return { success: true, data: movements };
  }
);

const adjustInventorySchema = z.object({
  productId: z.number(),
  currentStock: z.number(),
  adjustedStock: z.number().min(0, "調整後の在庫数は0以上である必要があります"),
  reason: z.string().min(1, "調整理由は必須です"),
});

export const adjustInventory = authenticatedAction(
  adjustInventorySchema,
  async (data) => {
    const movement = await inventoryService.adjustInventory(data);
    return { success: true, data: movement };
  }
);

// ========== Statistics and Reports Actions ==========

export const getInventoryStats = authenticatedAction(z.object({}), async () => {
  const stats = await inventoryService.getInventoryStats();
  return { success: true, data: stats };
});

export const getInventoryAlerts = authenticatedAction(
  z.object({}),
  async () => {
    const alerts = await inventoryService.getInventoryAlerts();
    return { success: true, data: alerts };
  }
);

const getInventoryReportSchema = z.object({
  productId: z.number(),
});

export const getInventoryReport = authenticatedAction(
  getInventoryReportSchema,
  async ({ productId }) => {
    const report = await inventoryService.getInventoryReport(productId);
    return { success: true, data: report };
  }
);

const getPeriodReportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export const getPeriodReport = authenticatedAction(
  getPeriodReportSchema,
  async ({ startDate, endDate }) => {
    const report = await inventoryService.getPeriodReport(startDate, endDate);
    return { success: true, data: report };
  }
);

export const getReorderSuggestions = authenticatedAction(
  z.object({}),
  async () => {
    const suggestions = await inventoryService.getReorderSuggestions();
    return { success: true, data: suggestions };
  }
);

export const getCategories = authenticatedAction(z.object({}), async () => {
  const categories = await inventoryService.getCategories();
  return { success: true, data: categories };
});

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

export const batchUpdateStock = authenticatedAction(
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
    return { success: true, data: results };
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
