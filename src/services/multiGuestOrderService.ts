import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";

type GuestOrder = Database["public"]["Tables"]["guest_orders"]["Row"];

type GuestOrderUpdate = Database["public"]["Tables"]["guest_orders"]["Update"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

export interface GuestOrderWithDetails extends GuestOrder {
  order_item: OrderItem & {
    product: Product;
  };
}

export interface OrderAssignmentInput {
  visit_guest_id: string;
  quantity_for_guest: number;
  amount_for_guest: number;
  is_shared_item?: boolean;
  shared_percentage?: number;
}

export interface GuestShareInput {
  guest_id: string;
  percentage: number;
}

export class MultiGuestOrderService {
  /**
   * Create an order for a specific guest
   */
  static async createGuestOrder(
    visitGuestId: string,
    orderItemId: number,
    quantity: number,
    amount: number,
    isShared: boolean = false,
    sharedPercentage?: number
  ): Promise<GuestOrder | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("guest_orders")
        .insert({
          visit_guest_id: visitGuestId,
          order_item_id: orderItemId,
          quantity_for_guest: quantity,
          amount_for_guest: amount,
          is_shared_item: isShared,
          shared_percentage: sharedPercentage,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating guest order:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in createGuestOrder:", error);
      return null;
    }
  }

  /**
   * Assign an existing order item to a guest
   */
  static async assignOrderToGuest(
    orderItemId: number,
    guestId: string,
    quantity: number,
    amount: number
  ): Promise<boolean> {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("guest_orders").upsert(
        {
          visit_guest_id: guestId,
          order_item_id: orderItemId,
          quantity_for_guest: quantity,
          amount_for_guest: amount,
          is_shared_item: false,
        },
        {
          onConflict: "visit_guest_id,order_item_id",
        }
      );

      if (error) {
        console.error("Error assigning order to guest:", error);
        return false;
      }

      // Update the target_guest_id in order_items
      const { error: updateError } = await supabase
        .from("order_items")
        .update({ target_guest_id: guestId })
        .eq("id", orderItemId);

      if (updateError) {
        console.error("Error updating order item target guest:", updateError);
      }

      return true;
    } catch (error) {
      console.error("Error in assignOrderToGuest:", error);
      return false;
    }
  }

  /**
   * Create a shared order split among multiple guests
   */
  static async createSharedOrder(
    orderItemId: number,
    guestShares: GuestShareInput[]
  ): Promise<boolean> {
    try {
      // Validate that percentages sum to 100
      const totalPercentage = guestShares.reduce(
        (sum, share) => sum + share.percentage,
        0
      );
      if (Math.abs(totalPercentage - 100) > 0.01) {
        console.error("Guest share percentages must sum to 100");
        return false;
      }

      // Get the order item details
      const supabase = createClient();
      const { data: orderItem, error: fetchError } = await supabase
        .from("order_items")
        .select("*")
        .eq("id", orderItemId)
        .single();

      if (fetchError || !orderItem) {
        console.error("Error fetching order item:", fetchError);
        return false;
      }

      // Use the RPC function to split the order
      const { error } = await supabase.rpc("split_shared_order", {
        p_order_item_id: orderItemId,
        p_guest_splits: guestShares,
      });

      if (error) {
        console.error("Error splitting shared order:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in createSharedOrder:", error);
      return false;
    }
  }

  /**
   * Update order assignment for a guest
   */
  static async updateOrderAssignment(
    guestOrderId: string,
    updateData: GuestOrderUpdate
  ): Promise<GuestOrder | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("guest_orders")
        .update(updateData)
        .eq("id", guestOrderId)
        .select()
        .single();

      if (error) {
        console.error("Error updating order assignment:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in updateOrderAssignment:", error);
      return null;
    }
  }

  /**
   * Get all orders for a specific guest
   */
  static async getGuestOrders(
    visitGuestId: string
  ): Promise<GuestOrderWithDetails[]> {
    try {
      const supabase = createClient();
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

      if (error) {
        console.error("Error fetching guest orders:", error);
        return [];
      }

      return data as GuestOrderWithDetails[];
    } catch (error) {
      console.error("Error in getGuestOrders:", error);
      return [];
    }
  }

  /**
   * Get all orders for a visit grouped by guest
   */
  static async getVisitOrdersByGuest(
    visitId: string
  ): Promise<Map<string, GuestOrderWithDetails[]>> {
    try {
      // First get all guests for the visit
      const supabase = createClient();
      const { data: guests, error: guestsError } = await supabase
        .from("visit_guests")
        .select("id")
        .eq("visit_id", visitId);

      if (guestsError || !guests) {
        console.error("Error fetching visit guests:", guestsError);
        return new Map();
      }

      const guestIds = guests.map((g) => g.id);

      // Get all orders for these guests
      const { data: orders, error: ordersError } = await supabase
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
        .in("visit_guest_id", guestIds)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Error fetching guest orders:", ordersError);
        return new Map();
      }

      // Group orders by guest
      const ordersByGuest = new Map<string, GuestOrderWithDetails[]>();
      (orders as GuestOrderWithDetails[]).forEach((order) => {
        const guestId = order.visit_guest_id;
        if (!ordersByGuest.has(guestId)) {
          ordersByGuest.set(guestId, []);
        }
        ordersByGuest.get(guestId)!.push(order);
      });

      return ordersByGuest;
    } catch (error) {
      console.error("Error in getVisitOrdersByGuest:", error);
      return new Map();
    }
  }

  /**
   * Remove an order assignment from a guest
   */
  static async removeGuestOrder(guestOrderId: string): Promise<boolean> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("guest_orders")
        .delete()
        .eq("id", guestOrderId);

      if (error) {
        console.error("Error removing guest order:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in removeGuestOrder:", error);
      return false;
    }
  }

  /**
   * Transfer orders from one guest to another
   */
  static async transferOrders(
    fromGuestId: string,
    toGuestId: string,
    orderIds?: string[]
  ): Promise<boolean> {
    try {
      const supabase = createClient();
      let query = supabase
        .from("guest_orders")
        .update({ visit_guest_id: toGuestId })
        .eq("visit_guest_id", fromGuestId);

      if (orderIds && orderIds.length > 0) {
        query = query.in("id", orderIds);
      }

      const { error } = await query;

      if (error) {
        console.error("Error transferring orders:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in transferOrders:", error);
      return false;
    }
  }

  /**
   * Calculate total amount for a guest's orders
   */
  static async calculateGuestOrderTotal(visitGuestId: string): Promise<number> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("guest_orders")
        .select("amount_for_guest")
        .eq("visit_guest_id", visitGuestId);

      if (error) {
        console.error("Error calculating guest order total:", error);
        return 0;
      }

      return data.reduce((sum, order) => sum + order.amount_for_guest, 0);
    } catch (error) {
      console.error("Error in calculateGuestOrderTotal:", error);
      return 0;
    }
  }
}
