import { BaseService } from "./base.service";
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

export class BillingService extends BaseService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    super();
    this.supabase = createClient();
  }

  // ============= PRODUCT MANAGEMENT =============

  async createProduct(data: CreateProductData): Promise<Product> {
    const staffId = await this.getCurrentStaffId(this.supabase);

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
      this.handleError(error, "商品の作成に失敗しました");
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
      this.handleError(error, "商品情報の取得に失敗しました");
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
      this.handleError(error, "商品の検索に失敗しました");
    }

    return data.map(this.mapToProduct);
  }

  async updateProduct(id: number, data: UpdateProductData): Promise<Product> {
    const staffId = await this.getCurrentStaffId(this.supabase);

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
      this.handleError(error, "商品の更新に失敗しました");
    }

    return this.mapToProduct(product);
  }

  async deleteProduct(id: number): Promise<void> {
    const { error } = await this.supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      this.handleError(error, "商品の削除に失敗しました");
    }
  }

  // ============= VISIT MANAGEMENT =============

  async createVisit(data: CreateVisitData): Promise<Visit> {
    const staffId = await this.getCurrentStaffId(this.supabase);

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
      this.handleError(error, "来店記録の作成に失敗しました");
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
      this.handleError(error, "来店記録の取得に失敗しました");
    }

    return this.mapToVisit(data);
  }

  async getVisitWithDetails(id: string): Promise<VisitWithDetails | null> {
    // 1) Visit 本体を取得
    const { data: visitRow, error: visitError } = await this.supabase
      .from("visits")
      .select("*")
      .eq("id", id)
      .single();

    if (visitError) {
      if (visitError.code === "PGRST116") {
        return null;
      }
      this.handleError(visitError, "来店記録の詳細取得に失敗しました");
    }

    const visit = this.mapToVisit(visitRow);

    // 2) 顧客情報
    let customer:
      | { id: string; name: string; phoneNumber: string | null }
      | undefined;
    if (visit.customerId) {
      const { data: customerRow } = await this.supabase
        .from("customers")
        .select("id, name, phone_number")
        .eq("id", visit.customerId)
        .maybeSingle();
      if (customerRow) {
        customer = {
          id: customerRow.id,
          name: customerRow.name,
          phoneNumber: customerRow.phone_number,
        };
      }
    }

    // 3) 注文一覧（商品詳細付き）
    const { data: orderItemsRows, error: orderItemsError } = await this.supabase
      .from("order_items")
      .select(
        `
        *,
        product:products(*)
      `
      )
      .eq("visit_id", id)
      .order("created_at", { ascending: true });

    if (orderItemsError) {
      this.handleError(orderItemsError, "注文項目の取得に失敗しました");
    }

    const orderItems = (orderItemsRows || []).map((item) => ({
      ...this.mapToOrderItem(
        item as Database["public"]["Tables"]["order_items"]["Row"]
      ),
      product: item.product ? this.mapToProduct(item.product) : undefined,
    }));

    return {
      ...visit,
      customer,
      orderItems,
    };
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
      this.handleError(error, "来店記録の検索に失敗しました");
    }

    return data.map(this.mapToVisit);
  }

  async updateVisit(id: string, data: UpdateVisitData): Promise<Visit> {
    const staffId = await this.getCurrentStaffId(this.supabase);

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
      this.handleError(error, "来店記録の更新に失敗しました");
    }

    return this.mapToVisit(visit);
  }

  // ============= ORDER ITEM MANAGEMENT =============

  async addOrderItem(data: CreateOrderItemData): Promise<OrderItem> {
    const staffId = await this.getCurrentStaffId(this.supabase);

    // Get product price if unit price not provided
    let unitPrice = data.unitPrice;
    if (!unitPrice) {
      const product = await this.getProductById(data.productId);
      if (!product) {
        this.handleError(
          new Error("商品が見つかりません"),
          "商品が見つかりません"
        );
      }
      unitPrice = product.price;
    }

    // Calculate total price
    const totalPrice = unitPrice * data.quantity;

    const { data: orderItem, error } = await this.supabase
      .from("order_items")
      .insert({
        visit_id: data.visitId,
        product_id: data.productId,
        quantity: data.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        notes: data.notes || null,
        created_by: staffId,
      })
      .select()
      .single();

    if (error) {
      this.handleError(error, "注文の追加に失敗しました");
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
      this.handleError(error, "注文項目の取得に失敗しました");
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
      this.handleError(error, "注文項目の検索に失敗しました");
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
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: orderItem, error } = await this.supabase
      .from("order_items")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.handleError(error, "注文項目の更新に失敗しました");
    }

    return this.mapToOrderItem(orderItem);
  }

  async deleteOrderItem(id: number): Promise<void> {
    const { error } = await this.supabase
      .from("order_items")
      .delete()
      .eq("id", id);

    if (error) {
      this.handleError(error, "注文項目の削除に失敗しました");
    }
  }

  // ============= BILLING CALCULATIONS =============

  async calculateBill(visitId: string): Promise<BillCalculation> {
    // 商品の合計を計算
    const { data, error } = await this.supabase.rpc("calculate_visit_totals", {
      visit_id_param: visitId,
    });

    if (error) {
      this.handleError(error, "料金計算に失敗しました");
    }

    // 指名料を計算
    const { data: nominationData, error: nominationError } =
      await this.supabase.rpc("calculate_nomination_fees", {
        p_visit_id: visitId,
      });

    if (nominationError) {
      console.error("Error calculating nomination fees:", nominationError);
    }

    const nominationFee = nominationData?.[0]?.total_nomination_fee || 0;

    // bill_item_attributionsを考慮したキャスト別売上を計算
    const { data: attributions } = await this.supabase
      .from("bill_item_attributions")
      .select(
        `
        order_item_id,
        cast_id,
        attribution_percentage,
        order_items!inner(
          total_price
        )
      `
      )
      .eq("order_items.visit_id", visitId);

    // キャスト別の売上を集計
    const castAttributions = new Map<string, number>();
    if (attributions) {
      for (const attr of attributions) {
        const castId = attr.cast_id;
        // order_items is returned as an array in nested selects; take the first row
        const orderItemTotal = Array.isArray(attr.order_items)
          ? attr.order_items[0]?.total_price || 0
          : // Fallback for potential object typing
            // @ts-expect-error - runtime may return object depending on relation inference
            attr.order_items?.total_price || 0;
        const amount = Math.floor(
          orderItemTotal * (attr.attribution_percentage / 100)
        );

        const current = castAttributions.get(castId) || 0;
        castAttributions.set(castId, current + amount);
      }
    }

    if (!data || data.length === 0) {
      return {
        subtotal: nominationFee,
        serviceCharge: 0,
        taxAmount: Math.floor(nominationFee * 0.1), // 10%税金
        totalAmount: nominationFee + Math.floor(nominationFee * 0.1),
      };
    }

    // 商品合計に指名料を加算
    const subtotal = (data[0].subtotal || 0) + nominationFee;
    const serviceCharge = data[0].serviceCharge || 0;
    const taxAmount = Math.floor((subtotal + serviceCharge) * 0.1);
    const totalAmount = subtotal + serviceCharge + taxAmount;

    return {
      subtotal,
      serviceCharge,
      taxAmount,
      totalAmount,
    };
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
    try {
      // Use optimized RPC functions to get all report data efficiently
      const [billingReport, topProducts, topCasts] = await Promise.all([
        // Get basic billing statistics
        this.supabase.rpc("generate_daily_billing_report", {
          report_date: date,
        }),
        // Get top products
        this.supabase.rpc("get_top_products_with_details", {
          report_date: date,
          limit_count: 5,
        }),
        // Get top cast performance
        this.supabase.rpc("get_top_cast_performance", {
          report_date: date,
          limit_count: 5,
        }),
      ]);

      if (billingReport.error) {
        console.error("Daily billing report RPC error:", billingReport.error);
        throw new Error(
          billingReport.error.code === "42883"
            ? "Required database function is missing. Please run migrations."
            : this.handleDatabaseError(
                billingReport.error,
                "日別レポートの生成に失敗しました"
              )
        );
      }

      const reportData = billingReport.data;

      return {
        date,
        totalVisits: Number(reportData.total_visits) || 0,
        totalSales: Number(reportData.total_sales) || 0,
        totalCash: Number(reportData.cash_sales) || 0,
        totalCard: Number(reportData.card_sales) || 0,
        topProducts: (topProducts.data || []).map(
          (p: {
            product_id: string;
            product_name: string;
            quantity_sold: number;
            revenue: number;
          }) => ({
            productId: p.product_id,
            productName: p.product_name,
            quantity: Number(p.quantity_sold),
            totalAmount: Number(p.revenue),
          })
        ),
        topCasts: (topCasts.data || []).map(
          (c: {
            cast_id: string;
            staff_name: string;
            total_sales: number;
            visits_attended?: number;
          }) => ({
            castId: c.cast_id,
            castName: c.staff_name,
            orderCount: Number(c.visits_attended || 0),
            totalAmount: Number(c.total_sales),
          })
        ),
      };
    } catch (error) {
      console.error("Failed to generate daily report:", error);
      throw error;
    }
  }

  private async getOrderItemsWithDetails(startDate: string, endDate: string) {
    const { data, error } = await this.supabase
      .from("order_items")
      .select(
        `
        *,
        product:products(*),
        visit:visits!visit_id(check_in_at)
      `
      )
      .gte("visit.check_in_at", startDate)
      .lte("visit.check_in_at", endDate);

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to fetch order items with details:", error);
      }
      return [];
    }

    return (data || []).map((item) => ({
      ...this.mapToOrderItem(item),
      product: item.product ? this.mapToProduct(item.product) : undefined,
      cast: item.cast
        ? {
            id: item.cast.id,
            fullName: item.cast.full_name,
          }
        : undefined,
    }));
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
      quantity: data.quantity,
      unitPrice: data.unit_price,
      totalPrice: data.total_price,
      notes: data.notes,
      createdBy: data.created_by,
      createdAt: data.created_at,
      isSharedItem: data.is_shared_item,
      targetGuestId: data.target_guest_id,
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
      created_by: string | null;
      created_at: string;
      is_shared_item: boolean;
      target_guest_id: string | null;
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
  // ============= CASH CLOSING OPERATIONS =============

  async performDailyClosing(date: string): Promise<DailyReport> {
    try {
      // 1. Get all active visits for the day and finalize them
      const activeVisits = await this.searchVisits({
        status: "active",
        startDate: `${date}T00:00:00.000Z`,
        endDate: `${date}T23:59:59.999Z`,
      });

      // 2. Finalize all active visits (set checkout time and calculate final bills)
      for (const visit of activeVisits) {
        await this.finalizeVisit(visit.id);
      }

      // 3. Generate final daily report
      const dailyReport = await this.generateDailyReport(date);

      // 4. Create a daily closing record (optional - for audit trail)
      await this.createDailyClosingRecord(date, dailyReport);

      return dailyReport;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to perform daily closing:", error);
      }
      throw new Error("レジ締め処理に失敗しました");
    }
  }

  private async finalizeVisit(visitId: string): Promise<void> {
    const staffId = await this.getCurrentStaffId(this.supabase);

    const { error } = await this.supabase
      .from("visits")
      .update({
        check_out_at: new Date().toISOString(),
        status: "completed",
        updated_by: staffId,
      })
      .eq("id", visitId)
      .eq("status", "active"); // Only update if still active

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error(`Failed to finalize visit ${visitId}:`, error);
      }
      throw new Error(`来店記録 ${visitId} の確定に失敗しました`);
    }
  }

  private async createDailyClosingRecord(
    date: string,
    report: DailyReport
  ): Promise<void> {
    const staffId = await this.getCurrentStaffId(this.supabase);

    // Create a record in a daily_closings table (if it exists)
    // This is optional and depends on your database schema
    try {
      const { error } = await this.supabase.from("daily_closings").insert({
        closing_date: date,
        total_sales: report.totalSales,
        total_visits: report.totalVisits,
        total_cash: report.totalCash,
        total_card: report.totalCard,
        closed_by: staffId,
        closed_at: new Date().toISOString(),
      });

      // If the table doesn't exist, log as warning
      if (error) {
        if (
          error.message.includes("relation") ||
          error.message.includes("does not exist")
        ) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "Daily closings table not available, skipping record creation:",
              error.message
            );
          }
        } else {
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to create daily closing record:", error);
          }
          // Don't throw here to avoid breaking the main closing process
        }
      }
    } catch (error) {
      // Log unexpected errors as warnings to avoid breaking the main process
      if (process.env.NODE_ENV === "development") {
        console.warn("Unexpected error creating daily closing record:", error);
      }
    }
  }

  async getDailyClosingStatus(date: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("daily_closings")
        .select("id")
        .eq("closing_date", date)
        .maybeSingle();

      if (error) {
        // If table doesn't exist or other error, consider as not closed
        if (process.env.NODE_ENV === "development") {
          console.warn("Failed to check daily closing status:", error);
        }
        return false;
      }

      return !!data;
    } catch {
      // If table doesn't exist, consider as not closed
      return false;
    }
  }

  async checkOpenVisits(date: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("visits")
      .select("id")
      .eq("status", "active")
      .gte("check_in_at", `${date}T00:00:00.000Z`)
      .lt("check_in_at", `${date}T23:59:59.999Z`);

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to check open visits:", error);
      }
      return 0;
    }

    return data?.length || 0;
  }
}

// Export singleton instance
export const billingService = new BillingService();
