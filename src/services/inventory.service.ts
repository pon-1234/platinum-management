import { BaseService } from "./base.service";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logger } from "@/lib/logger";
import type {
  Product,
  CreateProductData,
  UpdateProductData,
  InventoryMovement,
  CreateInventoryMovementRequest,
  InventoryStats,
  InventoryReport,
  InventoryAlert,
  InventoryAdjustmentData,
  InventorySearchFilter,
  PeriodInventoryReport,
  ReorderSuggestion,
} from "@/types/inventory.types";

export class InventoryService extends BaseService {
  private supabase: SupabaseClient<Database>;
  constructor() {
    super();
    this.supabase = createClient();
  }

  // 商品管理
  async getProducts(filter?: InventorySearchFilter): Promise<Product[]> {
    try {
      let query = this.supabase
        .from("products")
        .select("*")
        .eq("is_active", true);

      if (filter?.category) {
        query = query.eq("category", filter.category);
      }

      if (filter?.searchTerm) {
        query = query.ilike("name", `%${filter.searchTerm}%`);
      }

      if (filter?.isLowStock) {
        // RPC関数で低在庫商品を取得
        const { data: lowStockProducts, error } = await this.supabase.rpc(
          "get_low_stock_products"
        );

        if (error) {
          throw new Error(
            error.code === "42883"
              ? "Required database function is missing. Please run migrations."
              : this.handleDatabaseError(error, "商品取得に失敗しました")
          );
        }

        let filteredProducts = lowStockProducts || [];

        // 他のフィルタを適用
        if (filter.category) {
          filteredProducts = filteredProducts.filter(
            (product: Product) => product.category === filter.category
          );
        }

        if (filter.searchTerm) {
          const searchLower = filter.searchTerm.toLowerCase();
          filteredProducts = filteredProducts.filter((product: Product) =>
            product.name.toLowerCase().includes(searchLower)
          );
        }

        return filteredProducts;
      }

      if (filter?.isOutOfStock) {
        query = query.eq("stock_quantity", 0);
      }

      if (filter?.sortBy) {
        const order = filter.sortOrder || "asc";
        switch (filter.sortBy) {
          case "name":
            query = query.order("name", { ascending: order === "asc" });
            break;
          case "stock":
            query = query.order("stock_quantity", {
              ascending: order === "asc",
            });
            break;
          case "lastUpdated":
            query = query.order("updated_at", { ascending: order === "asc" });
            break;
        }
      } else {
        query = query.order("name");
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "商品取得に失敗しました")
        );
      }

      return data || [];
    } catch (error) {
      logger.error("getProducts failed", error, "InventoryService");
      throw error;
    }
  }

  async getProductById(id: number): Promise<Product | null> {
    try {
      const { data, error } = await this.supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw new Error(
          this.handleDatabaseError(error, "商品取得に失敗しました")
        );
      }

      return data;
    } catch (error) {
      logger.error("getProductById failed", error, "InventoryService");
      throw error;
    }
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      const staffId = await this.getCurrentStaffId(this.supabase);
      const insertData = {
        ...this.toSnakeCase(data),
        created_by: staffId,
        updated_by: staffId,
      };

      const { data: product, error } = await this.supabase
        .from("products")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "商品作成に失敗しました")
        );
      }

      return product;
    } catch (error) {
      logger.error("createProduct failed", error, "InventoryService");
      throw error;
    }
  }

  async updateProduct(id: number, data: UpdateProductData): Promise<Product> {
    try {
      const staffId = await this.getCurrentStaffId(this.supabase);
      const updateData = {
        ...this.toSnakeCase(data),
        updated_by: staffId,
      };

      const { data: product, error } = await this.supabase
        .from("products")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "商品更新に失敗しました")
        );
      }

      return product;
    } catch (error) {
      logger.error("updateProduct failed", error, "InventoryService");
      throw error;
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("products")
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "商品削除に失敗しました")
        );
      }
    } catch (error) {
      logger.error("deleteProduct failed", error, "InventoryService");
      throw error;
    }
  }

  // 在庫変動管理（トランザクション制御付き）
  async createInventoryMovement(
    data: CreateInventoryMovementRequest
  ): Promise<InventoryMovement> {
    try {
      // RPC関数を使用してトランザクション内で在庫移動と在庫更新を実行
      const { data: result, error } = await this.supabase.rpc(
        "create_inventory_movement_with_stock_update",
        {
          p_product_id: data.productId,
          p_movement_type: data.movementType,
          p_quantity: data.quantity,
          p_unit_cost: data.unitCost || null,
          p_reason: data.reason || null,
          p_reference_id: data.referenceId || null,
        }
      );

      if (error) {
        throw new Error(`在庫変動記録エラー: ${error.message}`);
      }

      // 作成された在庫移動レコードを取得
      const { data: movement, error: fetchError } = await this.supabase
        .from("inventory_movements")
        .select("*")
        .eq("id", result.movement_id)
        .single();

      if (fetchError || !movement) {
        throw new Error("在庫移動レコードの取得に失敗しました");
      }

      return movement;
    } catch (error) {
      logger.error(
        "Inventory movement RPC error",
        error as Error,
        "InventoryService"
      );
      if (error instanceof Error) {
        const isRPCMissing = error.message.includes(
          "function create_inventory_movement_with_stock_update"
        );
        throw new Error(
          isRPCMissing
            ? "Required database function is missing. Please run migrations."
            : this.handleDatabaseError(
                error as Error,
                "在庫移動の作成に失敗しました"
              )
        );
      }
      throw error;
    }
  }

  async getInventoryMovements(
    productId?: number,
    startDate?: string,
    endDate?: string,
    offset?: number,
    limit?: number
  ): Promise<InventoryMovement[]> {
    try {
      let query = this.supabase
        .from("inventory_movements")
        .select(
          `
          *,
          products:product_id (name, category),
          staffs:created_by (full_name)
        `
        )
        .order("created_at", { ascending: false });

      if (productId) {
        query = query.eq("product_id", productId);
      }

      if (startDate) {
        query = query.gte("created_at", startDate);
      }

      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      // Pagination (optional)
      if (typeof offset === "number" && typeof limit === "number") {
        query = query.range(offset, offset + limit - 1);
      } else if (typeof limit === "number") {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "在庫変動履歴取得に失敗しました")
        );
      }

      return data || [];
    } catch (error) {
      logger.error("getInventoryMovements failed", error, "InventoryService");
      throw error;
    }
  }

  // 在庫調整
  async adjustInventory(
    data: InventoryAdjustmentData
  ): Promise<InventoryMovement> {
    // const difference = data.adjustedStock - data.currentStock;

    return this.createInventoryMovement({
      productId: data.productId,
      movementType: "adjustment",
      quantity: data.adjustedStock, // 調整の場合は新しい在庫数
      reason: data.reason,
    });
  }

  // 在庫統計
  async getInventoryStats(): Promise<InventoryStats> {
    try {
      // RPC関数を使用してデータベース側で集計
      const { data, error } = await this.supabase.rpc("get_inventory_stats");

      if (error) {
        logger.error("Inventory stats RPC error", error, "InventoryService");
        throw new Error(
          error.code === "42883"
            ? "Required database function is missing. Please run migrations."
            : this.handleDatabaseError(error, "在庫統計取得に失敗しました")
        );
      }

      return {
        totalProducts: Number(data.total_products) || 0,
        lowStockItems: Number(data.low_stock_items) || 0,
        outOfStockItems: Number(data.out_of_stock_items) || 0,
        totalValue: Number(data.total_value) || 0,
      };
    } catch (error) {
      logger.error("getInventoryStats failed", error, "InventoryService");
      throw error;
    }
  }

  // 在庫アラート
  async getInventoryAlerts(): Promise<InventoryAlert[]> {
    try {
      // RPC関数を使用してデータベース側でアラートを生成
      const { data, error } = await this.supabase.rpc("get_inventory_alerts");

      if (error) {
        logger.error("Inventory alerts RPC error", error, "InventoryService");
        throw new Error(
          error.code === "42883"
            ? "Required database function is missing. Please run migrations."
            : this.handleDatabaseError(error, "在庫アラート取得に失敗しました")
        );
      }

      // RPCからのデータを適切な型に変換
      return (data || []).map(
        (alert: {
          id: string;
          product_id: string;
          product_name: string;
          current_stock: number;
          threshold: number;
          status: string;
          category_name: string;
          alert_type?: string;
          severity?: string;
        }) => ({
          id: alert.id,
          productId: parseInt(alert.product_id, 10),
          productName: alert.product_name,
          currentStock: alert.current_stock,
          threshold: alert.threshold,
          alertType: (alert.alert_type || alert.status) as
            | "out_of_stock"
            | "low_stock"
            | "overstock",
          severity: (alert.severity || "warning") as "critical" | "warning",
          createdAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error("getInventoryAlerts failed", error, "InventoryService");
      throw error;
    }
  }

  // 在庫レポート
  async getInventoryReport(productId: number): Promise<InventoryReport> {
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error("商品が見つかりません");
    }

    const movements = await this.getInventoryMovements(productId);
    const lastMovement = movements[0];

    return {
      product,
      currentStock: product.stock_quantity,
      movements,
      lastMovement,
      isLowStock: product.stock_quantity <= product.low_stock_threshold,
      isOutOfStock: product.stock_quantity === 0,
      estimatedValue: product.stock_quantity * product.cost,
    };
  }

  // 期間別レポート
  async getPeriodReport(
    startDate: string,
    endDate: string
  ): Promise<PeriodInventoryReport> {
    const movements = await this.getInventoryMovements(
      undefined,
      startDate,
      endDate
    );

    const totalMovements = movements.length;
    const incomingStock = movements
      .filter((m) => m.movement_type === "in")
      .reduce((sum, m) => sum + m.quantity, 0);
    const outgoingStock = movements
      .filter((m) => m.movement_type === "out")
      .reduce((sum, m) => sum + m.quantity, 0);
    const adjustments = movements.filter(
      (m) => m.movement_type === "adjustment"
    ).length;

    // 最も動いた商品を計算
    const productMovements = new Map<
      number,
      { quantity: number; count: number }
    >();
    movements.forEach((m) => {
      const current = productMovements.get(m.product_id) || {
        quantity: 0,
        count: 0,
      };
      productMovements.set(m.product_id, {
        quantity: current.quantity + Math.abs(m.quantity),
        count: current.count + 1,
      });
    });

    // Get top moved products with actual product data
    const topProductIds = Array.from(productMovements.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 5)
      .map(([productId]) => productId);

    const topMovedProducts = [];
    for (const productId of topProductIds) {
      const product = await this.getProductById(productId);
      const stats = productMovements.get(productId)!;
      if (product) {
        topMovedProducts.push({
          product,
          totalQuantity: stats.quantity,
          movementCount: stats.count,
        });
      }
    }

    return {
      startDate,
      endDate,
      totalMovements,
      incomingStock,
      outgoingStock,
      adjustments,
      topMovedProducts,
    };
  }

  // 発注提案
  async getReorderSuggestions(): Promise<ReorderSuggestion[]> {
    const products = await this.getProducts();
    const suggestions: ReorderSuggestion[] = [];

    for (const product of products) {
      if (product.stock_quantity <= product.reorder_point) {
        const suggestedQuantity = product.max_stock - product.stock_quantity;
        const estimatedCost = suggestedQuantity * product.cost;

        let priority: "high" | "medium" | "low" = "medium";
        if (product.stock_quantity === 0) {
          priority = "high";
        } else if (product.stock_quantity <= product.low_stock_threshold) {
          priority = "high";
        } else {
          priority = "low";
        }

        suggestions.push({
          product,
          currentStock: product.stock_quantity,
          reorderPoint: product.reorder_point,
          suggestedQuantity,
          estimatedCost,
          priority,
        });
      }
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // カテゴリー一覧取得
  async getCategories(): Promise<string[]> {
    try {
      // RPC関数を使用してデータベース側で重複を除去
      const { data, error } = await this.supabase.rpc(
        "get_distinct_product_categories"
      );

      if (error) {
        logger.error("Categories RPC error", error, "InventoryService");
        throw new Error(
          error.code === "42883"
            ? "Required database function is missing. Please run migrations."
            : this.handleDatabaseError(error, "カテゴリー取得に失敗しました")
        );
      }

      return (data || []).map((row: { category: string }) => row.category);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        logger.error("getCategories failed", error, "InventoryService");
      }
      throw error;
    }
  }

  // 在庫ページの全データを一度に取得（パフォーマンス最適化）
  async getInventoryPageData(
    filter?: InventorySearchFilter & { offset?: number; limit?: number }
  ) {
    try {
      // 最適化されたRPC関数を使用
      const functionName = "get_inventory_page_data_optimized";
      const { data, error } = await this.supabase.rpc(functionName, {
        p_category: filter?.category || null,
        p_search_term: filter?.searchTerm || null,
        p_offset: filter?.offset || 0,
        p_limit: filter?.limit || 50,
      });

      if (error || !data) {
        logger.error(
          "Inventory page data RPC error",
          error || new Error("empty result"),
          "InventoryService"
        );
        // Fallback: 手動で必要なデータを組み立て（RPC未導入/失敗時でもUIを継続）
        const products = await this.getProducts({
          category: filter?.category,
          searchTerm: filter?.searchTerm,
        });
        const paged = products
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(
            filter?.offset || 0,
            (filter?.offset || 0) + (filter?.limit || 50)
          );
        const stats = await this.getInventoryStats().catch(() => ({
          totalProducts: products.length,
          lowStockItems: products.filter(
            (p) =>
              p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0
          ).length,
          outOfStockItems: products.filter((p) => p.stock_quantity === 0)
            .length,
          totalValue: products.reduce(
            (sum, p) => sum + (p.stock_quantity || 0) * (p.cost || 0),
            0
          ),
        }));
        const categories = Array.from(
          new Set(products.map((p) => p.category).filter(Boolean))
        ).sort();
        const alerts = await this.getInventoryAlerts().catch(() => []);
        return {
          products: paged,
          stats,
          alerts,
          categories,
          totalCount: products.length,
        };
      }

      return this.parseInventoryPageData(data || {});
    } catch (error) {
      logger.error("getInventoryPageData failed", error, "InventoryService");
      // Final fallback
      return {
        products: [],
        stats: {
          totalProducts: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          totalValue: 0,
        },
        alerts: [],
        categories: [],
        totalCount: 0,
      };
    }
  }

  private parseInventoryPageData(result: {
    products?: Product[];
    stats?: {
      total_products: number;
      low_stock_items: number;
      out_of_stock_items: number;
      total_value: number;
    };
    alerts?: Array<{
      id: string;
      product_id: string;
      product_name: string;
      current_stock: number;
      threshold: number;
      status: string;
      category_name: string;
      alert_type?: string;
      severity?: string;
    }>;
    categories?: string[];
    total_count?: number;
  }) {
    return {
      products: result.products || [],
      stats: result.stats
        ? {
            totalProducts: Number(result.stats.total_products) || 0,
            lowStockItems: Number(result.stats.low_stock_items) || 0,
            outOfStockItems: Number(result.stats.out_of_stock_items) || 0,
            totalValue: Number(result.stats.total_value) || 0,
          }
        : {
            totalProducts: 0,
            lowStockItems: 0,
            outOfStockItems: 0,
            totalValue: 0,
          },
      alerts: (result.alerts || []).map((alert) => ({
        id: alert.id,
        productId: parseInt(alert.product_id, 10),
        productName: alert.product_name,
        currentStock: alert.current_stock,
        threshold: alert.threshold,
        alertType: (alert.alert_type || alert.status) as
          | "out_of_stock"
          | "low_stock"
          | "overstock",
        severity: (alert.severity || "warning") as "critical" | "warning",
        createdAt: new Date().toISOString(),
      })),
      categories: result.categories || [],
      totalCount: result.total_count || result.products?.length || 0,
    };
  }
}

// Export singleton instance
export const inventoryService = new InventoryService();
