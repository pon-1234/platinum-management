import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventoryService } from "../inventory.service";
import { createClient } from "@/lib/supabase/client";
import type {
  Product,
  CreateProductData,
  UpdateProductData,
  CreateInventoryMovementRequest,
  InventoryMovement,
} from "@/types/inventory.types";

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("InventoryService", () => {
  let service: InventoryService;
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
    auth: {
      getUser: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a fresh mock for each test
    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    };

    // Set up default mock implementations
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    // Mock createClient to return our mockSupabase
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );

    service = new InventoryService();
  });

  describe("Product Management", () => {
    describe("getProducts", () => {
      it("should return all active products", async () => {
        const mockProducts: Product[] = [
          {
            id: 1,
            name: "ビール",
            category: "飲料",
            price: 500,
            cost: 200,
            stock_quantity: 100,
            low_stock_threshold: 20,
            reorder_point: 30,
            supplier_info: null,
            max_stock: 200,
            is_active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            created_by: "user1",
            updated_by: "user1",
          },
        ];

        const mockQuery = {
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          data: mockProducts,
          error: null,
        };

        mockSupabase.from = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(mockQuery),
        });

        const result = await service.getProducts();

        expect(mockSupabase.from).toHaveBeenCalledWith("products");
        expect(mockQuery.eq).toHaveBeenCalledWith("is_active", true);
        expect(result).toEqual(mockProducts);
      });

      it("should filter products by category", async () => {
        const mockQuery = {
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          data: [],
          error: null,
        };

        mockSupabase.from = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(mockQuery),
        });

        await service.getProducts({ category: "飲料" });

        expect(mockQuery.eq).toHaveBeenCalledWith("category", "飲料");
      });

      it("should filter products by search term", async () => {
        const mockQuery = {
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          data: [],
          error: null,
        };

        mockSupabase.from = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(mockQuery),
        });

        await service.getProducts({ searchTerm: "ビール" });

        expect(mockQuery.ilike).toHaveBeenCalledWith("name", "%ビール%");
      });

      it("should handle low stock filter", async () => {
        const mockLowStockProducts = [
          { id: 1, stock_quantity: 5, low_stock_threshold: 10 },
        ];

        mockSupabase.rpc = vi.fn().mockResolvedValue({
          data: mockLowStockProducts,
          error: null,
        });

        const result = await service.getProducts({ isLowStock: true });

        expect(mockSupabase.rpc).toHaveBeenCalledWith("get_low_stock_products");
        expect(result).toEqual(mockLowStockProducts);
      });
    });

    describe("createProduct", () => {
      it("should create a new product", async () => {
        const createData: CreateProductData = {
          name: "新商品",
          category: "食品",
          price: 1000,
          cost: 400,
          stock_quantity: 50,
          low_stock_threshold: 10,
          reorder_point: 15,
          max_stock: 100,
        };

        const mockProduct: Product = {
          id: 1,
          ...createData,
          cost: createData.cost || 200,
          stock_quantity: createData.stock_quantity || 50,
          low_stock_threshold: createData.low_stock_threshold || 15,
          supplier_info: createData.supplier_info || null,
          reorder_point: createData.reorder_point || 15,
          max_stock: createData.max_stock || 100,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          created_by: "user1",
          updated_by: "user1",
        };

        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProduct, error: null }),
        };

        mockSupabase.from = vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue(mockQuery),
        });

        const result = await service.createProduct(createData);

        expect(mockSupabase.from).toHaveBeenCalledWith("products");
        expect(result).toEqual(mockProduct);
      });

      it("should throw error when creation fails", async () => {
        const mockQuery = {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        };

        mockSupabase.from = vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue(mockQuery),
        });

        await expect(
          service.createProduct({} as CreateProductData)
        ).rejects.toThrow("商品作成に失敗しました");
      });
    });

    describe("updateProduct", () => {
      it("should update a product", async () => {
        const updateData: UpdateProductData = {
          price: 600,
          stock_quantity: 120,
        };

        const mockProduct: Product = {
          id: 1,
          name: "ビール",
          category: "飲料",
          price: 600,
          cost: 200,
          stock_quantity: 120,
          low_stock_threshold: 20,
          reorder_point: 30,
          supplier_info: null,
          max_stock: 200,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          created_by: "user1",
          updated_by: "user1",
        };

        const mockQuery = {
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProduct, error: null }),
        };

        mockSupabase.from = vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue(mockQuery),
        });

        const result = await service.updateProduct(1, updateData);

        expect(mockSupabase.from).toHaveBeenCalledWith("products");
        expect(mockQuery.eq).toHaveBeenCalledWith("id", 1);
        expect(result).toEqual(mockProduct);
      });
    });

    describe("deleteProduct", () => {
      it("should soft delete a product", async () => {
        const mockQuery = {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };

        mockSupabase.from = vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue(mockQuery),
        });

        await service.deleteProduct(1);

        expect(mockSupabase.from).toHaveBeenCalledWith("products");
        expect(mockQuery.eq).toHaveBeenCalledWith("id", 1);
      });
    });
  });

  describe("Inventory Movement Management", () => {
    describe("createInventoryMovement", () => {
      it("should create an inventory movement and update stock", async () => {
        const movementData: CreateInventoryMovementRequest = {
          productId: 1,
          movementType: "in",
          quantity: 50,
          unitCost: 200,
          reason: "仕入れ",
        };

        const mockMovement: InventoryMovement = {
          id: 1,
          product_id: 1,
          movement_type: "in",
          quantity: 50,
          unit_cost: 200,
          reason: "仕入れ",
          reference_id: null,
          created_at: "2024-01-01T00:00:00Z",
          created_by: "user1",
        };

        const mockProduct: Product = {
          id: 1,
          name: "ビール",
          category: "飲料",
          price: 500,
          cost: 200,
          stock_quantity: 100,
          low_stock_threshold: 20,
          reorder_point: 30,
          supplier_info: null,
          max_stock: 200,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          created_by: "user1",
          updated_by: "user1",
        };

        // Mock RPC function for inventory movement
        mockSupabase.rpc = vi.fn().mockResolvedValue({
          data: {
            movement_id: 1,
            product: { ...mockProduct, stock_quantity: 150 },
          },
          error: null,
        });

        // Mock fetching the created movement
        mockSupabase.from = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockMovement,
                error: null,
              }),
            }),
          }),
        });

        const result = await service.createInventoryMovement(movementData);

        expect(result).toEqual(mockMovement);
      });

      it("should prevent negative stock", async () => {
        const movementData: CreateInventoryMovementRequest = {
          productId: 1,
          movementType: "out",
          quantity: 150, // More than current stock
          reason: "販売",
        };

        // Mock RPC function to return insufficient stock error
        mockSupabase.rpc = vi.fn().mockResolvedValue({
          data: null,
          error: { message: "在庫が不足しています" },
        });

        await expect(
          service.createInventoryMovement(movementData)
        ).rejects.toThrow("在庫移動の作成に失敗しました");
      });
    });

    describe("adjustInventory", () => {
      it("should create an adjustment movement", async () => {
        const adjustmentData = {
          productId: 1,
          currentStock: 100,
          adjustedStock: 80,
          reason: "棚卸し調整",
        };

        const mockMovement: InventoryMovement = {
          id: 1,
          product_id: 1,
          movement_type: "adjustment",
          quantity: 80,
          unit_cost: null,
          reason: "棚卸し調整",
          reference_id: null,
          created_at: "2024-01-01T00:00:00Z",
          created_by: "user1",
        };

        // Mock the createInventoryMovement method
        vi.spyOn(service, "createInventoryMovement").mockResolvedValue(
          mockMovement
        );

        const result = await service.adjustInventory(adjustmentData);

        expect(service.createInventoryMovement).toHaveBeenCalledWith({
          productId: 1,
          movementType: "adjustment",
          quantity: 80,
          reason: "棚卸し調整",
        });
        expect(result).toEqual(mockMovement);
      });
    });
  });

  describe("Inventory Statistics and Reports", () => {
    describe("getInventoryStats", () => {
      it("should return inventory statistics", async () => {
        // Mock RPC response
        mockSupabase.rpc = vi.fn().mockResolvedValue({
          data: {
            total_products: 100,
            low_stock_items: 3,
            out_of_stock_items: 5,
            total_value: 35000,
          },
          error: null,
        });

        const result = await service.getInventoryStats();

        expect(result).toEqual({
          totalProducts: 100,
          lowStockItems: 3,
          outOfStockItems: 5,
          totalValue: 35000,
        });

        expect(mockSupabase.rpc).toHaveBeenCalledWith("get_inventory_stats");
      });
    });

    describe("getInventoryAlerts", () => {
      it("should generate alerts for low and out of stock items", async () => {
        const mockAlerts = [
          {
            id: "alert-1",
            product_id: "1",
            product_name: "在庫切れ商品",
            current_stock: 0,
            threshold: 20,
            status: "out_of_stock",
            category_name: "飲料",
            alert_type: "out_of_stock",
            severity: "critical",
          },
          {
            id: "alert-2",
            product_id: "2",
            product_name: "低在庫商品",
            current_stock: 15,
            threshold: 20,
            status: "low_stock",
            category_name: "食品",
            alert_type: "low_stock",
            severity: "warning",
          },
        ];

        // Mock RPC success
        mockSupabase.rpc = vi.fn().mockResolvedValue({
          data: mockAlerts,
          error: null,
        });

        const alerts = await service.getInventoryAlerts();

        expect(alerts).toHaveLength(2);
        expect(alerts[0]).toMatchObject({
          productId: 1,
          alertType: "out_of_stock",
          severity: "critical",
        });
        expect(alerts[1]).toMatchObject({
          productId: 2,
          alertType: "low_stock",
          severity: "warning",
        });
      });
    });

    describe("getReorderSuggestions", () => {
      it("should suggest reorders for products below reorder point", async () => {
        const mockProducts: Product[] = [
          {
            id: 1,
            name: "要発注商品",
            category: "飲料",
            price: 500,
            cost: 200,
            stock_quantity: 25,
            low_stock_threshold: 20,
            reorder_point: 30,
            supplier_info: null,
            max_stock: 200,
            is_active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            created_by: "user1",
            updated_by: "user1",
          },
        ];

        vi.spyOn(service, "getProducts").mockResolvedValue(mockProducts);

        const suggestions = await service.getReorderSuggestions();

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toMatchObject({
          product: mockProducts[0],
          currentStock: 25,
          reorderPoint: 30,
          suggestedQuantity: 175, // max_stock (200) - current (25)
          estimatedCost: 35000, // 175 * 200
          priority: "low",
        });
      });
    });
  });
});
