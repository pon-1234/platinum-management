import { BaseService } from "./base.service";
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
  constructor() {
    super();
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
          // RPCが存在しない場合は従来の方法でフォールバック
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "RPC get_low_stock_productsが存在しません。クライアントサイドで処理します。"
            );
          }
          const { data: allProducts, error: queryError } = await query;
          if (queryError) {
            throw new Error(
              this.handleDatabaseError(queryError, "商品取得に失敗しました")
            );
          }
          return (allProducts || []).filter(
            (product) => product.stock_quantity < product.low_stock_threshold
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
      if (process.env.NODE_ENV === "development") {
        console.error("getProducts failed:", error);
      }
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
      if (process.env.NODE_ENV === "development") {
        console.error("getProductById failed:", error);
      }
      throw error;
    }
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      const { data: product, error } = await this.supabase
        .from("products")
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "商品作成に失敗しました")
        );
      }

      return product;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("createProduct failed:", error);
      }
      throw error;
    }
  }

  async updateProduct(id: number, data: UpdateProductData): Promise<Product> {
    try {
      const { data: product, error } = await this.supabase
        .from("products")
        .update({ ...data })
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
      if (process.env.NODE_ENV === "development") {
        console.error("updateProduct failed:", error);
      }
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
      if (process.env.NODE_ENV === "development") {
        console.error("deleteProduct failed:", error);
      }
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
      // RPC関数が存在しない場合のフォールバック
      if (
        error instanceof Error &&
        error.message.includes(
          "function create_inventory_movement_with_stock_update"
        )
      ) {
        if (process.env.NODE_ENV === "development") {
          console.warn("RPC関数が存在しません。従来の方法で処理します。");
        }
        return this.createInventoryMovementFallback(data);
      }
      throw error;
    }
  }

  // フォールバック用の従来の実装
  private async createInventoryMovementFallback(
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

      const { data, error } = await query;

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "在庫変動履歴取得に失敗しました")
        );
      }

      return data || [];
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getInventoryMovements failed:", error);
      }
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
        // RPC関数が存在しない場合は従来の方法にフォールバック
        if (error.message.includes("function get_inventory_stats")) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "RPC get_inventory_stats not found, falling back to client-side calculation"
            );
          }
          return this.getInventoryStatsFallback();
        }
        throw new Error(
          this.handleDatabaseError(error, "在庫統計取得に失敗しました")
        );
      }

      return {
        totalProducts: Number(data.total_products) || 0,
        lowStockItems: Number(data.low_stock_items) || 0,
        outOfStockItems: Number(data.out_of_stock_items) || 0,
        totalValue: Number(data.total_value) || 0,
      };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getInventoryStats failed:", error);
      }
      throw error;
    }
  }

  // フォールバック用の従来の実装
  private async getInventoryStatsFallback(): Promise<InventoryStats> {
    // データベースで直接カウントと集計を実行
    const { count: totalProducts, error: totalError } = await this.supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (totalError) {
      throw new Error(
        this.handleDatabaseError(totalError, "商品総数取得に失敗しました")
      );
    }

    const { count: outOfStockItems, error: outOfStockError } =
      await this.supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("stock_quantity", 0);

    if (outOfStockError) {
      throw new Error(
        this.handleDatabaseError(
          outOfStockError,
          "在庫切れ商品数取得に失敗しました"
        )
      );
    }

    // 低在庫アイテムは計算列を使用できないため、RPCまたはクライアント側処理
    let lowStockItems = 0;
    const { data: lowStockData, error: lowStockError } =
      await this.supabase.rpc("count_low_stock_products");

    if (lowStockError) {
      // RPCが存在しない場合はフォールバック
      const { data: productsData, error: productsError } = await this.supabase
        .from("products")
        .select("stock_quantity, low_stock_threshold")
        .eq("is_active", true);

      if (productsError) {
        throw new Error(
          this.handleDatabaseError(
            productsError,
            "商品データ取得に失敗しました"
          )
        );
      }

      lowStockItems =
        productsData?.filter((p) => p.stock_quantity <= p.low_stock_threshold)
          .length || 0;
    } else {
      lowStockItems = lowStockData || 0;
    }

    // 在庫価値の合計
    const { data: valueData, error: valueError } = await this.supabase
      .from("products")
      .select("stock_quantity, cost")
      .eq("is_active", true);

    if (valueError) {
      throw new Error(
        this.handleDatabaseError(valueError, "在庫価値データ取得に失敗しました")
      );
    }

    const totalValue =
      valueData?.reduce((sum, p) => sum + p.stock_quantity * p.cost, 0) || 0;

    return {
      totalProducts: totalProducts || 0,
      lowStockItems,
      outOfStockItems: outOfStockItems || 0,
      totalValue,
    };
  }

  // 在庫アラート
  async getInventoryAlerts(): Promise<InventoryAlert[]> {
    try {
      // RPC関数を使用してデータベース側でアラートを生成
      const { data, error } = await this.supabase.rpc("get_inventory_alerts");

      if (error) {
        // RPC関数が存在しない場合は従来の方法にフォールバック
        if (error.message.includes("function get_inventory_alerts")) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "RPC get_inventory_alerts not found, falling back to client-side calculation"
            );
          }
          return this.getInventoryAlertsFallback();
        }
        throw new Error(
          this.handleDatabaseError(error, "在庫アラート取得に失敗しました")
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
          productId: alert.product_id,
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
      if (process.env.NODE_ENV === "development") {
        console.error("getInventoryAlerts failed:", error);
      }
      throw error;
    }
  }

  // フォールバック用の従来の実装
  private async getInventoryAlertsFallback(): Promise<InventoryAlert[]> {
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
        // RPC関数が存在しない場合は従来の方法にフォールバック
        if (
          error.message.includes("function get_distinct_product_categories")
        ) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "RPC get_distinct_product_categories not found, falling back to client-side calculation"
            );
          }
          return this.getCategoriesFallback();
        }
        throw new Error(
          this.handleDatabaseError(error, "カテゴリー取得に失敗しました")
        );
      }

      return (data || []).map((row: { category: string }) => row.category);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getCategories failed:", error);
      }
      throw error;
    }
  }

  // フォールバック用の従来の実装
  private async getCategoriesFallback(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("products")
      .select("category")
      .eq("is_active", true);

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "カテゴリー取得に失敗しました")
      );
    }

    const categories = [...new Set(data?.map((d) => d.category) || [])];
    return categories.sort();
  }

  // 在庫ページの全データを一度に取得（パフォーマンス最適化）
  async getInventoryPageData(filter?: InventorySearchFilter) {
    try {
      // RPC関数を使用してデータベース側で全データを集約
      const { data, error } = await this.supabase.rpc(
        "get_inventory_page_data",
        {
          p_category: filter?.category || null,
          p_search_term: filter?.searchTerm || null,
        }
      );

      if (error) {
        // RPC関数が存在しない場合は従来の方法にフォールバック
        if (error.message.includes("function get_inventory_page_data")) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "RPC get_inventory_page_data not found, falling back to individual queries"
            );
          }
          // 個別にデータを取得
          const [products, stats, alerts, categories] = await Promise.all([
            this.getProducts(filter),
            this.getInventoryStats(),
            this.getInventoryAlerts(),
            this.getCategories(),
          ]);
          return { products, stats, alerts, categories };
        }
        const errorMessage = `在庫ページデータ取得に失敗しました: ${error.message}`;
        if (process.env.NODE_ENV === "development") {
          console.error("getInventoryPageData RPC error:", error);
        }
        throw new Error(errorMessage);
      }

      // RPC結果をパース
      const result = data || {};
      return {
        products: result.products || [],
        stats: result.stats || {
          totalProducts: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          totalValue: 0,
        },
        alerts: (result.alerts || []).map(
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
            productId: alert.product_id,
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
        ),
        categories: result.categories || [],
      };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getInventoryPageData failed:", error);
      }
      throw error;
    }
  }
}

// Export singleton instance
export const inventoryService = new InventoryService();
