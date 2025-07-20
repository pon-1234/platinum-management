import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
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

export class InventoryService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createClient();
  }

  // 商品管理
  async getProducts(filter?: InventorySearchFilter): Promise<Product[]> {
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
      query = query.lt(
        "stock_quantity",
        this.supabase.raw("low_stock_threshold")
      );
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
          query = query.order("stock_quantity", { ascending: order === "asc" });
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
      throw new Error(`商品取得エラー: ${error.message}`);
    }

    return data || [];
  }

  async getProductById(id: number): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`商品取得エラー: ${error.message}`);
    }

    return data;
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    const { data: product, error } = await this.supabase
      .from("products")
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`商品作成エラー: ${error.message}`);
    }

    return product;
  }

  async updateProduct(id: number, data: UpdateProductData): Promise<Product> {
    const { data: product, error } = await this.supabase
      .from("products")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`商品更新エラー: ${error.message}`);
    }

    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    const { error } = await this.supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      throw new Error(`商品削除エラー: ${error.message}`);
    }
  }

  // 在庫変動管理
  async createInventoryMovement(
    data: CreateInventoryMovementRequest
  ): Promise<InventoryMovement> {
    const { data: movement, error } = await this.supabase
      .from("inventory_movements")
      .insert({
        product_id: data.productId,
        movement_type: data.movementType,
        quantity: data.quantity,
        unit_cost: data.unitCost,
        reason: data.reason,
        reference_id: data.referenceId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`在庫変動記録エラー: ${error.message}`);
    }

    // 商品の在庫数を更新
    await this.updateProductStock(
      data.productId,
      data.quantity,
      data.movementType
    );

    return movement;
  }

  private async updateProductStock(
    productId: number,
    quantity: number,
    movementType: string
  ): Promise<void> {
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error("商品が見つかりません");
    }

    let newStock = product.stock_quantity;

    switch (movementType) {
      case "in":
        newStock += quantity;
        break;
      case "out":
        newStock -= quantity;
        break;
      case "adjustment":
        newStock = quantity; // 調整の場合は絶対値
        break;
    }

    // 在庫がマイナスにならないようにチェック
    if (newStock < 0) {
      throw new Error("在庫が不足しています");
    }

    await this.updateProduct(productId, { stock_quantity: newStock });
  }

  async getInventoryMovements(
    productId?: number,
    startDate?: string,
    endDate?: string
  ): Promise<InventoryMovement[]> {
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

    const { data, error } = await query;

    if (error) {
      throw new Error(`在庫変動履歴取得エラー: ${error.message}`);
    }

    return data || [];
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
    const products = await this.getProducts();

    const totalProducts = products.length;
    const lowStockItems = products.filter(
      (p) => p.stock_quantity <= p.low_stock_threshold
    ).length;
    const outOfStockItems = products.filter(
      (p) => p.stock_quantity === 0
    ).length;
    const totalValue = products.reduce(
      (sum, p) => sum + p.stock_quantity * p.cost,
      0
    );

    return {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalValue,
    };
  }

  // 在庫アラート
  async getInventoryAlerts(): Promise<InventoryAlert[]> {
    const products = await this.getProducts();
    const alerts: InventoryAlert[] = [];

    products.forEach((product) => {
      if (product.stock_quantity === 0) {
        alerts.push({
          id: `out-${product.id}`,
          productId: product.id,
          productName: product.name,
          currentStock: product.stock_quantity,
          threshold: product.low_stock_threshold,
          alertType: "out_of_stock",
          severity: "critical",
          createdAt: new Date().toISOString(),
        });
      } else if (product.stock_quantity <= product.low_stock_threshold) {
        alerts.push({
          id: `low-${product.id}`,
          productId: product.id,
          productName: product.name,
          currentStock: product.stock_quantity,
          threshold: product.low_stock_threshold,
          alertType: "low_stock",
          severity: "warning",
          createdAt: new Date().toISOString(),
        });
      } else if (product.stock_quantity >= product.max_stock) {
        alerts.push({
          id: `over-${product.id}`,
          productId: product.id,
          productName: product.name,
          currentStock: product.stock_quantity,
          threshold: product.max_stock,
          alertType: "overstock",
          severity: "warning",
          createdAt: new Date().toISOString(),
        });
      }
    });

    return alerts.sort((a, b) => {
      if (a.severity === "critical" && b.severity === "warning") return -1;
      if (a.severity === "warning" && b.severity === "critical") return 1;
      return 0;
    });
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

    const topMovedProducts = Array.from(productMovements.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 5)
      .map(([productId, stats]) => {
        const productMovement = movements.find(
          (m) => m.product_id === productId
        );
        // Placeholder for product data - in real implementation, fetch from products table
        const product = {
          id: productId,
          name: "Product",
          category: "Category",
          price: 0,
        };
        return {
          product,
          totalQuantity: stats.quantity,
          movementCount: stats.count,
        };
      });

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
    const { data, error } = await this.supabase
      .from("products")
      .select("category")
      .eq("is_active", true);

    if (error) {
      throw new Error(`カテゴリー取得エラー: ${error.message}`);
    }

    const categories = [...new Set(data?.map((d) => d.category) || [])];
    return categories.sort();
  }
}
