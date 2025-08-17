import { BaseService } from "./base.service";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logger } from "@/lib/logger";
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

  // ===== Session-centric thin adapters =====
  async getOpenCheckBySession(
    visitId: string
  ): Promise<VisitWithDetails | null> {
    return this.getVisitWithDetails(visitId);
  }

  async addItemToSession(
    visitId: string,
    payload: {
      productId: number;
      quantity: number;
      unitPrice?: number;
      notes?: string;
    }
  ): Promise<OrderItem> {
    return this.addOrderItem({ visitId, ...payload });
  }

  async checkoutSession(visitId: string, payment: PaymentData): Promise<Visit> {
    return this.processPayment(visitId, payment);
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
      const q = params.query;
      // name / name_kana / short_name / alias / sku / code を横断検索（存在するカラムのみヒット）
      // Supabase(PostgREST)の or フィルタを活用
      query = query.or(
        [
          `name.ilike.%${q}%`,
          `name_kana.ilike.%${q}%`,
          `short_name.ilike.%${q}%`,
          `alias.ilike.%${q}%`,
          `sku.ilike.%${q}%`,
          `code.ilike.%${q}%`,
          // 数字コードにも対応
          `id.eq.${Number(q) || 0}`,
        ].join(",")
      );
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

    // Build insert payload, omitting optional fields when not provided
    const insertPayload: Record<string, unknown> = {
      table_id: data.tableId,
      num_guests: data.numGuests,
      check_in_at: data.checkInAt || new Date().toISOString(),
      notes: data.notes || null,
      status: "active",
      payment_status: "pending",
      created_by: staffId,
      updated_by: staffId,
    };
    // Do not auto-link to a placeholder customer. Keep null until assigned.
    if (data.customerId) insertPayload.customer_id = data.customerId;

    const { data: visit, error } = await this.supabase
      .from("visits")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      this.handleError(error, "来店記録の作成に失敗しました");
    }

    // Create initial table segment as the source of truth
    try {
      await this.supabase.from("visit_table_segments").insert({
        visit_id: visit.id,
        table_id: data.tableId,
        reason: "initial",
        started_at: new Date().toISOString(),
      });
    } catch (e) {
      logger.warn("Failed to create initial table segment", "BillingService", {
        visitId: visit.id,
        tableId: data.tableId,
      });
    }
    // Update table occupancy status (do not fail the flow)
    try {
      await this.supabase
        .from("tables")
        .update({
          current_status: "occupied",
          current_visit_id: visit.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.tableId);
    } catch {
      // ignore occupancy update failure
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

    const visit = this.mapToVisit(data);

    // Override tableId with active segment if present
    let activeSegQuery = this.supabase
      .from("visit_table_segments")
      .select("table_id")
      .eq("visit_id", id);
    activeSegQuery = this.applyWhereNull(activeSegQuery, "ended_at");
    const { data: activeSeg } = await activeSegQuery
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeSeg?.table_id !== undefined && activeSeg?.table_id !== null) {
      visit.tableId = Number(activeSeg.table_id);
    }

    return visit;
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

    // Override tableId with active segment if present
    let activeSegQuery2 = this.supabase
      .from("visit_table_segments")
      .select("table_id")
      .eq("visit_id", id);
    activeSegQuery2 = this.applyWhereNull(activeSegQuery2, "ended_at");
    const { data: activeSeg } = await activeSegQuery2
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeSeg?.table_id !== undefined && activeSeg?.table_id !== null) {
      visit.tableId = Number(activeSeg.table_id);
    }

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

    // 4) キャスト割り当て（名称含む）
    const { data: castsRows } = await this.supabase
      .from("cast_engagements")
      .select(
        `cast_id, role, nomination_type:nomination_types(display_name), fee_amount, cast:casts_profile(id, stage_name, staffs(full_name))`
      )
      .eq("visit_id", id);

    type StaffsRow =
      | { full_name: string | null }
      | null
      | Array<{ full_name: string | null }>;
    type CastProfileRow =
      | { id: string; stage_name: string | null; staffs: StaffsRow }
      | null
      | Array<{ id: string; stage_name: string | null; staffs: StaffsRow }>;
    type NominationRow =
      | { display_name: string | null }
      | null
      | Array<{ display_name: string | null }>;
    type CastRow = {
      cast_id: string;
      role: string | null;
      nomination_type: NominationRow;
      fee_amount: number | null;
      cast: CastProfileRow;
    };
    const casts = ((castsRows || []) as CastRow[]).map((row) => {
      const castObj = Array.isArray(row.cast) ? row.cast[0] : row.cast;
      const staffs =
        castObj && Array.isArray(castObj.staffs)
          ? castObj.staffs[0]
          : castObj?.staffs;
      const nomination = Array.isArray(row.nomination_type)
        ? row.nomination_type[0]
        : row.nomination_type;
      return {
        castId: row.cast_id,
        name:
          castObj?.stage_name ||
          (staffs as { full_name: string | null } | null)?.full_name ||
          row.cast_id,
        role: row.role || undefined,
        nomination: nomination?.display_name || undefined,
        fee: row.fee_amount ?? undefined,
      };
    });

    return {
      ...visit,
      customer,
      orderItems,
      casts,
    };
  }

  async searchVisits(params: VisitSearchParams = {}): Promise<Visit[]> {
    // Base visits query
    let query = this.supabase
      .from("visits")
      .select("*")
      .order("check_in_at", { ascending: false });

    if (params.customerId) {
      query = query.eq("customer_id", params.customerId);
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

    // If filtering by table, constrain visits by active segments
    if (params.tableId !== undefined) {
      let segsQuery = this.supabase
        .from("visit_table_segments")
        .select("visit_id")
        .eq("table_id", params.tableId);
      segsQuery = this.applyWhereNull(segsQuery, "ended_at");
      const { data: segs, error: segErr } = (await segsQuery) as {
        data: Array<{ visit_id: string }>;
        error: unknown;
      };
      if (segErr) {
        this.handleError(segErr, "テーブル別の来店検索に失敗しました");
      }
      const visitIds = (segs || []).map((s) => s.visit_id as string);
      if (visitIds.length === 0) {
        return [];
      }
      query = query.in("id", visitIds);
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

    const visits = data.map(this.mapToVisit);

    // Override tableId with active segment if available
    const ids = visits.map((v) => v.id);
    if (ids.length > 0) {
      let segQueryAny = this.supabase
        .from("visit_table_segments")
        .select("visit_id, table_id")
        .in("visit_id", ids);
      segQueryAny = this.applyWhereNull(segQueryAny, "ended_at");
      const { data: activeSegs } = (await segQueryAny) as {
        data: Array<{ visit_id: string; table_id: number }>;
      };
      const visitIdToTableId = new Map<string, number>();
      (activeSegs || []).forEach((s) => {
        visitIdToTableId.set(s.visit_id as string, Number(s.table_id));
      });
      visits.forEach((v) => {
        const t = visitIdToTableId.get(v.id);
        if (t !== undefined) v.tableId = t;
      });
    }

    return visits;
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
    if (data.customerId !== undefined) updateData.customer_id = data.customerId;

    const { data: visit, error } = await this.supabase
      .from("visits")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.handleError(error, "来店記録の更新に失敗しました");
    }

    // If tableId changed, update segments and table occupancy
    try {
      if (data.tableId !== undefined) {
        await this.supabase
          .from("visit_table_segments")
          .update({ ended_at: new Date().toISOString() })
          .eq("visit_id", id)
          .is("ended_at", null);

        await this.supabase.from("visit_table_segments").insert({
          visit_id: id,
          table_id: data.tableId,
          reason: "move",
          started_at: new Date().toISOString(),
        });

        // Update table statuses
        await this.supabase
          .from("tables")
          .update({ current_status: "available", current_visit_id: null })
          .eq("current_visit_id", id);

        await this.supabase
          .from("tables")
          .update({
            current_status: "occupied",
            current_visit_id: id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.tableId);
      }
    } catch (e) {
      logger.warn(
        "Failed to update table segments on visit update",
        "BillingService",
        { visitId: id, tableId: data.tableId }
      );
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
    // 商品の合計を計算（RPCが無い場合はフォールバック）
    let data: Array<{ subtotal: number; serviceCharge?: number }> | null = null;
    const rpc = await this.supabase.rpc("calculate_visit_totals", {
      visit_id_param: visitId,
    });
    if (rpc.error) {
      // Fallback: order_items から小計を集計
      try {
        const { data: items } = await this.supabase
          .from("order_items")
          .select("total_price")
          .eq("visit_id", visitId);
        const sum = (items || []).reduce(
          (acc, cur) => acc + Number(cur.total_price || 0),
          0
        );
        data = [{ subtotal: sum, serviceCharge: 0 }];
      } catch (e) {
        this.handleError(rpc.error, "料金計算に失敗しました");
      }
    } else {
      data = rpc.data as typeof data;
    }

    // 指名料を計算
    let nominationData: any[] | null = null;
    const nom = await this.supabase.rpc("calculate_nomination_fees", {
      p_visit_id: visitId,
    });
    if (nom.error) {
      logger.logDatabaseError(
        nom.error,
        "rpc calculate_nomination_fees",
        "calculate_nomination_fees"
      );
      nominationData = [{ total_nomination_fee: 0 }];
    } else {
      nominationData = nom.data as any[];
    }

    const nominationFee = nominationData?.[0]?.total_nomination_fee || 0;

    // bill_item_attributionsを考慮したキャスト別売上を計算
    // まず対象のorder_items（id, total_price）を取得
    const { data: visitOrderItems } = await this.supabase
      .from("order_items")
      .select("id, total_price")
      .eq("visit_id", visitId);

    const orderItemIdToTotal = new Map<number, number>();
    const orderItemIds: number[] = [];
    (visitOrderItems || []).forEach((oi) => {
      orderItemIdToTotal.set(oi.id as number, oi.total_price as number);
      orderItemIds.push(oi.id as number);
    });

    let attributions: Array<{
      order_item_id: number;
      cast_id: string;
      attribution_percentage: number;
    }> = [];

    if (orderItemIds.length > 0) {
      const { data: attrs } = await this.supabase
        .from("bill_item_attributions")
        .select("order_item_id, cast_id, attribution_percentage")
        .in("order_item_id", orderItemIds);
      if (attrs) attributions = attrs as typeof attributions;
    }

    // キャスト別の売上を集計
    const castAttributions = new Map<string, number>();
    if (attributions) {
      for (const attr of attributions) {
        const castId = attr.cast_id;
        const total = orderItemIdToTotal.get(attr.order_item_id) || 0;
        const amount = Math.floor(total * (attr.attribution_percentage / 100));

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

    // Close active segments and free table occupancy
    try {
      let endSegQuery = this.supabase
        .from("visit_table_segments")
        .update({ ended_at: new Date().toISOString() })
        .eq("visit_id", visitId);
      endSegQuery = this.applyWhereNull(endSegQuery, "ended_at");
      await endSegQuery;

      await this.supabase
        .from("tables")
        .update({ current_status: "available", current_visit_id: null })
        .eq("current_visit_id", visitId);
    } catch (e) {
      logger.warn(
        "Failed to finalize segments/table on payment",
        "BillingService",
        { visitId }
      );
    }

    return updatedVisit;
  }

  /**
   * Mark visit as cancelled and free table occupancy.
   */
  async cancelVisit(visitId: string): Promise<void> {
    // Update visit status
    await this.updateVisit(visitId, {
      status: "cancelled",
      checkOutAt: new Date().toISOString(),
    });

    // Close active segments and free table occupancy
    try {
      let endSegQuery = this.supabase
        .from("visit_table_segments")
        .update({ ended_at: new Date().toISOString() })
        .eq("visit_id", visitId);
      endSegQuery = this.applyWhereNull(endSegQuery, "ended_at");
      await endSegQuery;

      await this.supabase
        .from("tables")
        .update({ current_status: "available", current_visit_id: null })
        .eq("current_visit_id", visitId);
    } catch (e) {
      logger.warn(
        "Failed to finalize segments/table on cancel",
        "BillingService",
        { visitId }
      );
    }
  }

  /**
   * Danger: Hard delete a visit and related data.
   */
  async deleteVisit(visitId: string): Promise<void> {
    // Delete order items
    await this.supabase.from("order_items").delete().eq("visit_id", visitId);
    // End and delete cast engagements
    await this.supabase
      .from("cast_engagements")
      .delete()
      .eq("visit_id", visitId);
    // Close and delete table segments
    await this.supabase
      .from("visit_table_segments")
      .update({ ended_at: new Date().toISOString() })
      .eq("visit_id", visitId);
    await this.supabase
      .from("tables")
      .update({ current_status: "available", current_visit_id: null })
      .eq("current_visit_id", visitId);
    await this.supabase
      .from("visit_table_segments")
      .delete()
      .eq("visit_id", visitId);
    // Finally delete visit
    await this.supabase.from("visits").delete().eq("id", visitId);
  }

  // ============= REPORTS =============

  async generateDailyReport(date: string): Promise<DailyReport> {
    try {
      // Use optimized RPC function for basic stats (fallbacks below if missing)
      const billingReport = await this.supabase.rpc(
        "generate_daily_billing_report",
        {
          report_date: date,
        }
      );

      if (billingReport.error) {
        logger.logDatabaseError(
          billingReport.error,
          "rpc generate_daily_billing_report",
          "generate_daily_billing_report"
        );
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

      // Top products: try RPC, then fallback to direct aggregation
      let topProductsList: Array<{
        productId: number;
        productName: string;
        quantity: number;
        totalAmount: number;
      }> = [];
      const tp = await this.supabase.rpc("get_top_products_with_details", {
        report_date: date,
        limit_count: 5,
      });
      if (!tp.error && tp.data) {
        topProductsList = (tp.data as any[]).map((p) => ({
          productId: Number(p.product_id),
          productName: p.product_name,
          quantity: Number(p.quantity_sold),
          totalAmount: Number(p.revenue),
        }));
      } else {
        // Fallback: aggregate from order_items for the date
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;
        const { data: rows } = await this.supabase
          .from("order_items")
          .select(
            `product_id, quantity, total_price, product:products(name), visit:visits(check_in_at)`
          )
          .gte("visit.check_in_at", start)
          .lte("visit.check_in_at", end);
        const byProduct = new Map<
          number,
          { name: string; qty: number; amt: number }
        >();
        (rows || []).forEach((r: any) => {
          const id = Number(r.product_id);
          const name = r.product?.name || String(id);
          const cur = byProduct.get(id) || { name, qty: 0, amt: 0 };
          cur.qty += Number(r.quantity || 0);
          cur.amt += Number(r.total_price || 0);
          byProduct.set(id, cur);
        });
        topProductsList = Array.from(byProduct.entries())
          .map(([id, v]) => ({
            productId: id,
            productName: v.name,
            quantity: v.qty,
            totalAmount: v.amt,
          }))
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, 5);
      }

      // Top casts: avoid calling missing RPC; aggregate from cast_engagements
      let topCastsList: Array<{
        castId: string;
        castName: string;
        orderCount: number;
        totalAmount: number;
      }> = [];
      try {
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;
        const { data: rows } = await this.supabase
          .from("cast_engagements")
          .select(
            `cast_id, fee_amount, visit:visits(check_in_at, status), cast:casts_profile(stage_name)`
          )
          .gte("visit.check_in_at", start)
          .lte("visit.check_in_at", end)
          .eq("visit.status", "completed");
        const byCast = new Map<
          string,
          { name: string; count: number; amt: number }
        >();
        (rows || []).forEach((r: any) => {
          const id = r.cast_id as string;
          const name = r.cast?.stage_name || id;
          const cur = byCast.get(id) || { name, count: 0, amt: 0 };
          cur.count += 1;
          cur.amt += Number(r.fee_amount || 0);
          byCast.set(id, cur);
        });
        topCastsList = Array.from(byCast.entries())
          .map(([id, v]) => ({
            castId: id,
            castName: v.name,
            orderCount: v.count,
            totalAmount: v.amt,
          }))
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, 5);
      } catch (e) {
        topCastsList = [];
      }

      return {
        date,
        totalVisits: Number(reportData.total_visits) || 0,
        totalSales: Number(reportData.total_sales) || 0,
        totalCash: Number(reportData.cash_sales) || 0,
        totalCard: Number(reportData.card_sales) || 0,
        topProducts: topProductsList,
        topCasts: topCastsList,
      };
    } catch (error) {
      logger.error("Failed to generate daily report", error, "BillingService");
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
      logger.error(
        "Failed to fetch order items with details",
        error,
        "BillingService"
      );
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
      logger.error("Failed to perform daily closing", error, "BillingService");
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
      logger.error(
        `Failed to finalize visit ${visitId}`,
        error,
        "BillingService"
      );
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
          (error as { message?: string }).message?.includes("relation") ||
          (error as { message?: string }).message?.includes("does not exist")
        ) {
          logger.warn(
            "Daily closings table not available, skipping record creation",
            "BillingService"
          );
        } else {
          logger.error(
            "Failed to create daily closing record",
            error,
            "BillingService"
          );
          // Don't throw here to avoid breaking the main closing process
        }
      }
    } catch (error) {
      // Log unexpected errors as warnings to avoid breaking the main process
      logger.warn(
        "Unexpected error creating daily closing record",
        "BillingService",
        { date }
      );
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
        logger.warn("Failed to check daily closing status", "BillingService");
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
      logger.error("Failed to check open visits", error, "BillingService");
      return 0;
    }

    return data?.length || 0;
  }

  // ============= QUOTE APPLICATION (from pricing engine) =============
  private async ensureSystemProduct(
    code: string,
    label: string,
    unitPrice: number
  ): Promise<number> {
    const systemName = `[SYS:${code}] ${label}`;

    // Try to find existing by name
    const { data: existing } = await this.supabase
      .from("products")
      .select("id, price")
      .eq("name", systemName)
      .maybeSingle();

    if (existing?.id) {
      // Optionally sync price
      if ((existing as any).price !== unitPrice) {
        await this.supabase
          .from("products")
          .update({ price: unitPrice, updated_at: new Date().toISOString() })
          .eq("id", (existing as any).id);
      }
      return (existing as any).id as number;
    }

    // Create a new system product (category: other)
    const { data: created, error } = await this.supabase
      .from("products")
      .insert({
        name: systemName,
        category: "other",
        price: unitPrice,
        cost: 0,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      this.handleError(error, "システム用商品作成に失敗しました");
    }
    return (created as any).id as number;
  }

  async applyQuoteToVisit(
    visitId: string,
    quote: import("@/types/billing.types").PriceQuote
  ): Promise<void> {
    // Remove existing system lines for same codes to avoid duplication
    try {
      const codes = quote.lines.map((l) => l.code);
      if (codes.length > 0) {
        await this.supabase
          .from("order_items")
          .delete()
          .eq("visit_id", visitId)
          .in("notes", codes);
      }
    } catch {
      // ignore cleanup failures
    }

    for (const line of quote.lines) {
      const productId = await this.ensureSystemProduct(
        line.code,
        line.label,
        line.unitPrice
      );
      await this.addOrderItem({
        visitId,
        productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        notes: line.code,
      });
    }
  }

  async finalizeVisitWithQuote(
    visitId: string,
    quote: import("@/types/billing.types").PriceQuote
  ): Promise<void> {
    // Set checkout and status
    await this.supabase
      .from("visits")
      .update({
        check_out_at: new Date().toISOString(),
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", visitId);

    // Apply quote items
    await this.applyQuoteToVisit(visitId, quote);

    // Calculate totals and persist
    const calc = await this.calculateBill(visitId);
    await this.updateVisit(visitId, {
      subtotal: calc.subtotal,
      serviceCharge: calc.serviceCharge,
      taxAmount: calc.taxAmount,
      totalAmount: calc.totalAmount,
      status: "completed",
    });
  }
}

// Export singleton instance
export const billingService = new BillingService();

// --- Pricing Engine (Appended on 2025-08-17) ---
import type {
  SeatPlan,
  PricingRequest,
  PriceLine,
  PriceQuote,
} from "@/types/billing.types";

const PRICING_TABLE = {
  BAR: {
    baseMinutes: 90,
    basePrice: 3000,
    ext: { stepMinutes: 30, pricePerStep: 1000 },
  },
  COUNTER: {
    baseMinutes: 60,
    basePrice: 8000,
    ext: { stepMinutes: 10, pricePerStep: 1000 },
  },
  VIP_A: {
    baseMinutes: 80,
    basePrice: 12000,
    ext: { stepMinutes: 60, pricePerStep: 10000 },
    room: {
      baseMinutes: 80,
      basePrice: 10000,
      ext: { stepMinutes: 60, pricePerStep: 10000 },
    },
  },
  VIP_B: {
    baseMinutes: 80,
    basePrice: 12000,
    ext: { stepMinutes: 60, pricePerStep: 10000 },
    room: {
      baseMinutes: 80,
      basePrice: 20000,
      ext: { stepMinutes: 60, pricePerStep: 20000 },
    },
  },
} as const;

const PLAN_LABEL: Record<SeatPlan, string> = {
  BAR: "BAR",
  COUNTER: "COUNTER",
  VIP_A: "VIP A",
  VIP_B: "VIP B",
};

function ceilDiv(n: number, d: number) {
  return Math.ceil(n / d);
}

export function quoteSession(req: PricingRequest): PriceQuote {
  const start = new Date(req.startAt);
  const end = new Date(req.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date(s) in PricingRequest");
  }

  const stayMinutes = Math.max(
    0,
    Math.ceil((end.getTime() - start.getTime()) / 60000)
  );
  const cfg = PRICING_TABLE[req.plan as SeatPlan];
  const lines: PriceLine[] = [];

  // Base set
  lines.push({
    code: `SET_${req.plan}`,
    label: `1セット【${PLAN_LABEL[req.plan as SeatPlan]}】（${cfg.baseMinutes}分）`,
    unitPrice: cfg.basePrice,
    quantity: 1,
    amount: cfg.basePrice,
  });

  // Set extension
  const overtime = Math.max(0, stayMinutes - cfg.baseMinutes);
  if (overtime > 0) {
    const units = ceilDiv(overtime, cfg.ext.stepMinutes);
    lines.push({
      code: `EXT_${req.plan}`,
      label:
        cfg.ext.stepMinutes === 10
          ? "延長（10分）"
          : cfg.ext.stepMinutes === 30
            ? "延長（30分）"
            : `延長セット（${cfg.ext.stepMinutes}分）`,
      unitPrice: cfg.ext.pricePerStep,
      quantity: units,
      amount: units * cfg.ext.pricePerStep,
      meta: { overtimeMinutes: overtime },
    });
  }

  // Room (VIP only)
  if ((req.useRoom ?? false) && (cfg as any).room) {
    const roomCfg = (cfg as any).room as {
      baseMinutes: number;
      basePrice: number;
      ext: { stepMinutes: number; pricePerStep: number };
    };

    lines.push({
      code: `ROOM_${req.plan}`,
      label: `ROOM（${roomCfg.baseMinutes}分）`,
      unitPrice: roomCfg.basePrice,
      quantity: 1,
      amount: roomCfg.basePrice,
    });

    const roomOvertime = Math.max(0, stayMinutes - roomCfg.baseMinutes);
    if (roomOvertime > 0) {
      const roomUnits = ceilDiv(roomOvertime, roomCfg.ext.stepMinutes);
      lines.push({
        code: `ROOM_EXT_${req.plan}`,
        label: `延長ROOM（${roomCfg.ext.stepMinutes}分）`,
        unitPrice: roomCfg.ext.pricePerStep,
        quantity: roomUnits,
        amount: roomUnits * roomCfg.ext.pricePerStep,
        meta: { overtimeMinutes: roomOvertime },
      });
    }
  }

  // Other fees
  const nominationCount = req.nominationCount ?? 0;
  if (nominationCount > 0) {
    lines.push({
      code: "NOMINATION",
      label: "指名料",
      unitPrice: 1000,
      quantity: nominationCount,
      amount: 1000 * nominationCount,
    });
  }

  const inhouseCount = req.inhouseCount ?? 0;
  if (inhouseCount > 0) {
    lines.push({
      code: "INHOUSE",
      label: "場内料",
      unitPrice: 1000,
      quantity: inhouseCount,
      amount: 1000 * inhouseCount,
    });
  }

  if (req.applyHouseFee) {
    lines.push({
      code: "HOUSE_FEE",
      label: "ハウス料",
      unitPrice: 2000,
      quantity: 1,
      amount: 2000,
    });
  }

  if (req.applySingleCharge) {
    lines.push({
      code: "SINGLE_CHARGE",
      label: "シングルチャージ",
      unitPrice: 2000,
      quantity: 1,
      amount: 2000,
    });
  }

  const drinks = req.drinkTotal ?? 0;
  if (drinks > 0) {
    lines.push({
      code: "DRINKS",
      label: "ドリンク",
      unitPrice: drinks,
      quantity: 1,
      amount: drinks,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  // New split rates (fallback to combined serviceTaxRate if provided)
  const serviceRate = req.serviceRate ?? 0;
  const taxRate = req.taxRate ?? 0;
  let serviceAmount = 0;
  let taxAmount = 0;
  if (serviceRate > 0 || taxRate > 0) {
    serviceAmount = Math.round(subtotal * serviceRate);
    taxAmount = Math.round((subtotal + serviceAmount) * taxRate);
  } else {
    const rate = req.serviceTaxRate ?? 0.2;
    serviceAmount = Math.round(subtotal * rate);
    taxAmount = 0;
  }
  const serviceTax = serviceAmount + taxAmount;
  const total = subtotal + serviceAmount + taxAmount;

  return {
    plan: req.plan,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    stayMinutes,
    lines,
    subtotal,
    serviceTax,
    serviceAmount,
    taxAmount,
    total,
  };
}

export { PRICING_TABLE };
