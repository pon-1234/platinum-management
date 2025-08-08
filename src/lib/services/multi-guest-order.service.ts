import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type GuestOrder = Database["public"]["Tables"]["guest_orders"]["Row"];
type GuestOrderInsert = Database["public"]["Tables"]["guest_orders"]["Insert"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

export interface GuestOrderWithDetails extends GuestOrder {
  order_item: OrderItem & {
    product: Product;
  };
}

export interface GuestShare {
  guestId: string;
  percentage: number;
}

export class MultiGuestOrderService {
  /**
   * ゲスト用の注文を作成
   */
  static async createGuestOrder(
    visitId: string,
    visitGuestId: string,
    productId: number,
    quantity: number,
    notes?: string
  ): Promise<{ orderItem: OrderItem; guestOrder: GuestOrder }> {
    try {
      // 商品情報を取得
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (productError) throw productError;

      const unitPrice = product.price;
      const totalPrice = unitPrice * quantity;

      // order_itemsに注文を作成
      const { data: orderItem, error: orderError } = await supabase
        .from("order_items")
        .insert({
          visit_id: visitId,
          product_id: productId,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          notes: notes,
          is_shared_item: false,
          target_guest_id: visitGuestId,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // guest_ordersに紐付けを作成
      const { data: guestOrder, error: guestOrderError } = await supabase
        .from("guest_orders")
        .insert({
          visit_guest_id: visitGuestId,
          order_item_id: orderItem.id,
          quantity_for_guest: quantity,
          amount_for_guest: totalPrice,
          is_shared_item: false,
        })
        .select()
        .single();

      if (guestOrderError) throw guestOrderError;

      return { orderItem, guestOrder };
    } catch (error) {
      console.error("Error creating guest order:", error);
      throw error;
    }
  }

  /**
   * 既存の注文をゲストに割り当て
   */
  static async assignOrderToGuest(
    orderItemId: number,
    guestId: string,
    quantity: number,
    amount?: number
  ): Promise<GuestOrder> {
    try {
      // 注文情報を取得
      const { data: orderItem, error: orderError } = await supabase
        .from("order_items")
        .select("*")
        .eq("id", orderItemId)
        .single();

      if (orderError) throw orderError;

      const amountForGuest =
        amount || (orderItem.total_price / orderItem.quantity) * quantity;

      // guest_ordersに紐付けを作成または更新
      const { data, error } = await supabase
        .from("guest_orders")
        .upsert({
          visit_guest_id: guestId,
          order_item_id: orderItemId,
          quantity_for_guest: quantity,
          amount_for_guest: amountForGuest,
          is_shared_item: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error assigning order to guest:", error);
      throw error;
    }
  }

  /**
   * 共有注文を作成
   */
  static async createSharedOrder(
    visitId: string,
    productId: number,
    quantity: number,
    guestShares: GuestShare[],
    notes?: string
  ): Promise<{ orderItem: OrderItem; guestOrders: GuestOrder[] }> {
    try {
      // 割合の合計が100%になることを確認
      const totalPercentage = guestShares.reduce(
        (sum, share) => sum + share.percentage,
        0
      );
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error("共有割合の合計は100%である必要があります");
      }

      // 商品情報を取得
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (productError) throw productError;

      const unitPrice = product.price;
      const totalPrice = unitPrice * quantity;

      // order_itemsに注文を作成
      const { data: orderItem, error: orderError } = await supabase
        .from("order_items")
        .insert({
          visit_id: visitId,
          product_id: productId,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          notes: notes,
          is_shared_item: true,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 各ゲストにguest_ordersを作成
      const guestOrders: GuestOrder[] = [];
      for (const share of guestShares) {
        const amountForGuest = Math.round(
          (totalPrice * share.percentage) / 100
        );

        const { data: guestOrder, error: guestOrderError } = await supabase
          .from("guest_orders")
          .insert({
            visit_guest_id: share.guestId,
            order_item_id: orderItem.id,
            quantity_for_guest: 1,
            amount_for_guest: amountForGuest,
            is_shared_item: true,
            shared_percentage: share.percentage,
          })
          .select()
          .single();

        if (guestOrderError) throw guestOrderError;
        guestOrders.push(guestOrder);
      }

      return { orderItem, guestOrders };
    } catch (error) {
      console.error("Error creating shared order:", error);
      throw error;
    }
  }

  /**
   * ゲストの注文を取得
   */
  static async getGuestOrders(
    visitGuestId: string
  ): Promise<GuestOrderWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from("guest_orders")
        .select(
          `
          *,
          order_item:order_items(
            *,
            product:products(*)
          )
        `
        )
        .eq("visit_guest_id", visitGuestId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching guest orders:", error);
      throw error;
    }
  }

  /**
   * 来店の全注文をゲスト別に取得
   */
  static async getVisitOrdersByGuest(
    visitId: string
  ): Promise<Map<string, GuestOrderWithDetails[]>> {
    try {
      const { data: guests, error: guestsError } = await supabase
        .from("visit_guests")
        .select("id")
        .eq("visit_id", visitId);

      if (guestsError) throw guestsError;

      const ordersByGuest = new Map<string, GuestOrderWithDetails[]>();

      for (const guest of guests || []) {
        const orders = await this.getGuestOrders(guest.id);
        ordersByGuest.set(guest.id, orders);
      }

      return ordersByGuest;
    } catch (error) {
      console.error("Error fetching visit orders by guest:", error);
      throw error;
    }
  }

  /**
   * 注文の割り当てを更新
   */
  static async updateOrderAssignment(
    guestOrderId: string,
    newGuestId: string,
    newQuantity?: number,
    newAmount?: number
  ): Promise<GuestOrder> {
    try {
      const updateData: Partial<GuestOrder> = {
        visit_guest_id: newGuestId,
      };

      if (newQuantity !== undefined) {
        updateData.quantity_for_guest = newQuantity;
      }

      if (newAmount !== undefined) {
        updateData.amount_for_guest = newAmount;
      }

      const { data, error } = await supabase
        .from("guest_orders")
        .update(updateData)
        .eq("id", guestOrderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating order assignment:", error);
      throw error;
    }
  }

  /**
   * ゲスト注文を削除
   */
  static async deleteGuestOrder(guestOrderId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("guest_orders")
        .delete()
        .eq("id", guestOrderId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting guest order:", error);
      throw error;
    }
  }
}
