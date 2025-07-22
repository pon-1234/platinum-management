import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  Product,
  Visit,
  OrderItem,
  VisitWithDetails,
  CreateProductData,
  UpdateProductData,
  ProductSearchParams,
  CreateVisitData,
  UpdateVisitData,
  VisitSearchParams,
  CreateOrderItemData,
  UpdateOrderItemData,
  OrderItemSearchParams,
  BillCalculation,
  PaymentData,
  DailyReport,
} from "@/types/billing.types";

export class BillingService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createClient();
  }

  // Helper method to get current staff ID
  private async getCurrentStaffId(): Promise<string> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) {
      throw new Error("認証が必要です");
    }

    const { data: staff, error } = await this.supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (error || !staff) {
      throw new Error("スタッフ情報が見つかりません");
    }

    return staff.id;
  }

  // ============= PRODUCT MANAGEMENT =============

  async createProduct(data: CreateProductData): Promise<Product> {
    const staffId = await this.getCurrentStaffId();

    const { data: product, error } = await this.supabase
      .from("products")
      .insert({
        name: data.name,
        category: data.category,
        price: data.price,
        cost: data.cost || 0,
        stock_quantity: data.stockQuantity || 0,
        low_stock_threshold: data.lowStockThreshold || 10,
        is_active: data.isActive ?? true,
        created_by: staffId,
        updated_by: staffId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`商品の作成に失敗しました: ${error.message}`);
    }

    return this.mapToProduct(product);
  }

  async getProductById(id: number): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`商品情報の取得に失敗しました: ${error.message}`);
    }

    return this.mapToProduct(data);
  }

  async searchProducts(params: ProductSearchParams = {}): Promise<Product[]> {
    let query = this.supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (params.query) {
      query = query.ilike("name", `%${params.query}%`);
    }

    if (params.category) {
      query = query.eq("category", params.category);
    }

    if (params.isActive !== undefined) {
      query = query.eq("is_active", params.isActive);
    }

    if (params.lowStock) {
      query = query.lt("stock_quantity", 10); // or use low_stock_threshold
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(
        params.offset,
        params.offset + (params.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`商品の検索に失敗しました: ${error.message}`);
    }

    return data.map(this.mapToProduct);
  }

  async updateProduct(id: number, data: UpdateProductData): Promise<Product> {
    const staffId = await this.getCurrentStaffId();

    const updateData: Record<string, unknown> = {
      updated_by: staffId,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.stockQuantity !== undefined)
      updateData.stock_quantity = data.stockQuantity;
    if (data.lowStockThreshold !== undefined)
      updateData.low_stock_threshold = data.lowStockThreshold;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: product, error } = await this.supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`商品の更新に失敗しました: ${error.message}`);
    }

    return this.mapToProduct(product);
  }

  async deleteProduct(id: number): Promise<void> {
    const { error } = await this.supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`商品の削除に失敗しました: ${error.message}`);
    }
  }

  // ============= VISIT MANAGEMENT =============

  async createVisit(data: CreateVisitData): Promise<Visit> {
    const staffId = await this.getCurrentStaffId();

    const { data: visit, error } = await this.supabase
      .from("visits")
      .insert({
        customer_id: data.customerId,
        table_id: data.tableId,
        num_guests: data.numGuests,
        check_in_at: data.checkInAt || new Date().toISOString(),
        notes: data.notes || null,
        created_by: staffId,
        updated_by: staffId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`来店記録の作成に失敗しました: ${error.message}`);
    }

    return this.mapToVisit(visit);
  }

  async getVisitById(id: string): Promise<Visit | null> {
    const { data, error } = await this.supabase
      .from("visits")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`来店記録の取得に失敗しました: ${error.message}`);
    }

    return this.mapToVisit(data);
  }

  async getVisitWithDetails(id: string): Promise<VisitWithDetails | null> {
    const { data, error } = await this.supabase
      .from("visits")
      .select(
        `
        *,
        customer:customers(id, name, phone_number),
        order_items(
          *,
          product:products(*),
          cast:staffs!cast_id(id, full_name)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`来店記録の詳細取得に失敗しました: ${error.message}`);
    }

    return this.mapToVisitWithDetails(data);
  }

  async searchVisits(params: VisitSearchParams = {}): Promise<Visit[]> {
    let query = this.supabase
      .from("visits")
      .select("*")
      .order("check_in_at", { ascending: false });

    if (params.customerId) {
      query = query.eq("customer_id", params.customerId);
    }

    if (params.tableId) {
      query = query.eq("table_id", params.tableId);
    }

    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.paymentStatus) {
      query = query.eq("payment_status", params.paymentStatus);
    }

    if (params.startDate) {
      query = query.gte("check_in_at", params.startDate);
    }

    if (params.endDate) {
      query = query.lte("check_in_at", params.endDate);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(
        params.offset,
        params.offset + (params.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`来店記録の検索に失敗しました: ${error.message}`);
    }

    return data.map(this.mapToVisit);
  }

  async updateVisit(id: string, data: UpdateVisitData): Promise<Visit> {
    const staffId = await this.getCurrentStaffId();

    const updateData: Record<string, unknown> = {
      updated_by: staffId,
    };

    if (data.tableId !== undefined) updateData.table_id = data.tableId;
    if (data.numGuests !== undefined) updateData.num_guests = data.numGuests;
    if (data.checkOutAt !== undefined)
      updateData.check_out_at = data.checkOutAt;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.serviceCharge !== undefined)
      updateData.service_charge = data.serviceCharge;
    if (data.taxAmount !== undefined) updateData.tax_amount = data.taxAmount;
    if (data.totalAmount !== undefined)
      updateData.total_amount = data.totalAmount;
    if (data.paymentMethod !== undefined)
      updateData.payment_method = data.paymentMethod;
    if (data.paymentStatus !== undefined)
      updateData.payment_status = data.paymentStatus;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: visit, error } = await this.supabase
      .from("visits")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`来店記録の更新に失敗しました: ${error.message}`);
    }

    return this.mapToVisit(visit);
  }

  // ============= ORDER ITEM MANAGEMENT =============

  async addOrderItem(data: CreateOrderItemData): Promise<OrderItem> {
    const staffId = await this.getCurrentStaffId();

    // Get product price if unit price not provided
    let unitPrice = data.unitPrice;
    if (!unitPrice) {
      const product = await this.getProductById(data.productId);
      if (!product) {
        throw new Error("商品が見つかりません");
      }
      unitPrice = product.price;
    }

    const { data: orderItem, error } = await this.supabase
      .from("order_items")
      .insert({
        visit_id: data.visitId,
        product_id: data.productId,
        cast_id: data.castId || null,
        quantity: data.quantity,
        unit_price: unitPrice,
        notes: data.notes || null,
        created_by: staffId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`注文の追加に失敗しました: ${error.message}`);
    }

    return this.mapToOrderItem(orderItem);
  }

  async getOrderItemById(id: number): Promise<OrderItem | null> {
    const { data, error } = await this.supabase
      .from("order_items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`注文項目の取得に失敗しました: ${error.message}`);
    }

    return this.mapToOrderItem(data);
  }

  async searchOrderItems(
    params: OrderItemSearchParams = {}
  ): Promise<OrderItem[]> {
    let query = this.supabase
      .from("order_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (params.visitId) {
      query = query.eq("visit_id", params.visitId);
    }

    if (params.productId) {
      query = query.eq("product_id", params.productId);
    }

    if (params.castId) {
      query = query.eq("cast_id", params.castId);
    }

    if (params.startDate) {
      query = query.gte("created_at", params.startDate);
    }

    if (params.endDate) {
      query = query.lte("created_at", params.endDate);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.range(
        params.offset,
        params.offset + (params.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`注文項目の検索に失敗しました: ${error.message}`);
    }

    return data.map(this.mapToOrderItem);
  }

  async updateOrderItem(
    id: number,
    data: UpdateOrderItemData
  ): Promise<OrderItem> {
    const updateData: Record<string, unknown> = {};

    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unitPrice !== undefined) updateData.unit_price = data.unitPrice;
    if (data.castId !== undefined) updateData.cast_id = data.castId;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: orderItem, error } = await this.supabase
      .from("order_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`注文項目の更新に失敗しました: ${error.message}`);
    }

    return this.mapToOrderItem(orderItem);
  }

  async deleteOrderItem(id: number): Promise<void> {
    const { error } = await this.supabase
      .from("order_items")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`注文項目の削除に失敗しました: ${error.message}`);
    }
  }

  // ============= BILLING CALCULATIONS =============

  async calculateBill(visitId: string): Promise<BillCalculation> {
    const { data, error } = await this.supabase.rpc("calculate_visit_totals", {
      visit_id_param: visitId,
    });

    if (error) {
      throw new Error(`料金計算に失敗しました: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        subtotal: 0,
        serviceCharge: 0,
        taxAmount: 0,
        totalAmount: 0,
      };
    }

    return data[0];
  }

  async processPayment(
    visitId: string,
    paymentData: PaymentData
  ): Promise<Visit> {
    // First calculate and update totals
    const billCalculation = await this.calculateBill(visitId);

    // Update visit with payment information and totals
    const updatedVisit = await this.updateVisit(visitId, {
      subtotal: billCalculation.subtotal,
      serviceCharge: billCalculation.serviceCharge,
      taxAmount: billCalculation.taxAmount,
      totalAmount: billCalculation.totalAmount,
      paymentMethod: paymentData.method,
      paymentStatus: "completed",
      status: "completed",
      checkOutAt: new Date().toISOString(),
      notes: paymentData.notes,
    });

    return updatedVisit;
  }

  // ============= REPORTS =============

  async generateDailyReport(date: string): Promise<DailyReport> {
    const startDate = `${date}T00:00:00.000Z`;
    const endDate = `${date}T23:59:59.999Z`;

    // Get daily visits
    const visits = await this.searchVisits({
      startDate,
      endDate,
      status: "completed",
    });

    const totalVisits = visits.length;
    const totalSales = visits.reduce(
      (sum, visit) => sum + (visit.totalAmount || 0),
      0
    );
    const totalCash = visits
      .filter((v) => v.paymentMethod === "cash")
      .reduce((sum, visit) => sum + (visit.totalAmount || 0), 0);
    const totalCard = visits
      .filter(
        (v) => v.paymentMethod === "card" || v.paymentMethod === "credit_card"
      )
      .reduce((sum, visit) => sum + (visit.totalAmount || 0), 0);

    // Get order items for the day
    await this.searchOrderItems({
      startDate,
      endDate,
    });

    // TODO: Implement top products and top casts aggregation

    return {
      date,
      totalVisits,
      totalSales,
      totalCash,
      totalCard,
      topProducts: [],
      topCasts: [],
    };
  }

  // ============= MAPPING FUNCTIONS =============

  private mapToProduct(
    data: Database["public"]["Tables"]["products"]["Row"]
  ): Product {
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      price: data.price,
      cost: data.cost,
      stockQuantity: data.stock_quantity,
      lowStockThreshold: data.low_stock_threshold,
      isActive: data.is_active,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToVisit(
    data: Database["public"]["Tables"]["visits"]["Row"]
  ): Visit {
    return {
      id: data.id,
      customerId: data.customer_id,
      tableId: data.table_id,
      checkInAt: data.check_in_at,
      checkOutAt: data.check_out_at,
      numGuests: data.num_guests,
      subtotal: data.subtotal,
      serviceCharge: data.service_charge,
      taxAmount: data.tax_amount,
      totalAmount: data.total_amount,
      paymentMethod: data.payment_method,
      paymentStatus: data.payment_status as
        | "pending"
        | "completed"
        | "cancelled",
      status: data.status as "active" | "completed" | "cancelled",
      notes: data.notes,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToOrderItem(
    data: Database["public"]["Tables"]["order_items"]["Row"]
  ): OrderItem {
    return {
      id: data.id,
      visitId: data.visit_id,
      productId: data.product_id,
      castId: data.cast_id,
      quantity: data.quantity,
      unitPrice: data.unit_price,
      totalPrice: data.total_price,
      notes: data.notes,
      createdBy: data.created_by,
      createdAt: data.created_at,
    };
  }

  private mapToVisitWithDetails(
    data: Record<string, unknown>
  ): VisitWithDetails {
    const visit = this.mapToVisit(
      data as Database["public"]["Tables"]["visits"]["Row"]
    );
    const customerData = data.customer as {
      id: string;
      name: string;
      phone_number: string | null;
    } | null;
    const orderItemsData = data.order_items as Array<{
      id: number;
      visit_id: string;
      product_id: number;
      cast_id: string | null;
      quantity: number;
      unit_price: number;
      total_price: number;
      notes: string | null;
      created_by: string;
      created_at: string;
      product?: Database["public"]["Tables"]["products"]["Row"];
      cast?: { id: string; full_name: string };
    }> | null;

    return {
      ...visit,
      customer: customerData
        ? {
            id: customerData.id,
            name: customerData.name,
            phoneNumber: customerData.phone_number,
          }
        : undefined,
      orderItems:
        orderItemsData?.map((item) => ({
          ...this.mapToOrderItem(item),
          product: item.product ? this.mapToProduct(item.product) : undefined,
          cast: item.cast
            ? {
                id: item.cast.id,
                fullName: item.cast.full_name,
              }
            : undefined,
        })) || [],
    };
  }
}

// Export singleton instance
export const billingService = new BillingService();
