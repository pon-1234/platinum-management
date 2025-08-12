import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { Database } from "@/types/database.types";

type VisitGuest = Database["public"]["Tables"]["visit_guests"]["Row"];
type VisitGuestInsert = Database["public"]["Tables"]["visit_guests"]["Insert"];
type VisitGuestUpdate = Database["public"]["Tables"]["visit_guests"]["Update"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

export interface VisitGuestWithCustomer extends VisitGuest {
  customer: Customer;
}

export class VisitGuestService {
  /**
   * 来店ゲストを追加
   */
  static async addGuestToVisit(
    visitId: string,
    customerData: {
      customerId?: string;
      name?: string;
      phone?: string;
    },
    guestType: "main" | "companion" | "additional" = "companion",
    additionalData?: Partial<VisitGuestInsert>
  ): Promise<VisitGuest> {
    try {
      const supabase = createClient();
      let customerId = customerData.customerId;

      // 新規顧客の場合は作成
      if (!customerId && customerData.name) {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: customerData.name,
            phone_number: customerData.phone,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      if (!customerId) {
        throw new Error("顧客IDまたは顧客情報が必要です");
      }

      // ゲストを追加
      const { data, error } = await supabase
        .from("visit_guests")
        .insert({
          visit_id: visitId,
          customer_id: customerId,
          guest_type: guestType,
          ...additionalData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error("Error adding guest to visit", error, "VisitGuestService");
      throw error;
    }
  }

  /**
   * ゲスト情報を更新
   */
  static async updateGuestInfo(
    guestId: string,
    updateData: VisitGuestUpdate
  ): Promise<VisitGuest> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("visit_guests")
        .update(updateData)
        .eq("id", guestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error("Error updating guest info", error, "VisitGuestService");
      throw error;
    }
  }

  /**
   * 来店の全ゲストを取得
   */
  static async getVisitGuests(
    visitId: string
  ): Promise<VisitGuestWithCustomer[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("visit_guests")
        .select(
          `
          *,
          customer:customers(*)
        `
        )
        .eq("visit_id", visitId)
        .order("guest_type", { ascending: true })
        .order("seat_position", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error("Error fetching visit guests", error, "VisitGuestService");
      throw error;
    }
  }

  /**
   * ゲストをチェックアウト
   */
  static async checkOutGuest(
    guestId: string,
    checkOutTime?: Date
  ): Promise<void> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("visit_guests")
        .update({
          check_out_time: (checkOutTime || new Date()).toISOString(),
        })
        .eq("id", guestId);

      if (error) throw error;
    } catch (error) {
      logger.error("Error checking out guest", error, "VisitGuestService");
      throw error;
    }
  }

  /**
   * ゲストを別の来店に移動
   */
  static async transferGuestToNewVisit(
    guestId: string,
    newVisitId: string
  ): Promise<void> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("visit_guests")
        .update({
          visit_id: newVisitId,
          check_in_time: new Date().toISOString(),
          check_out_time: null,
        })
        .eq("id", guestId);

      if (error) throw error;
    } catch (error) {
      logger.error("Error transferring guest", error, "VisitGuestService");
      throw error;
    }
  }

  /**
   * ゲストの個別会計を計算
   */
  static async calculateGuestBill(guestId: string): Promise<{
    subtotal: number;
    serviceCharge: number;
    taxAmount: number;
    total: number;
  }> {
    try {
      const supabase = createClient();
      // ゲストの注文を集計
      const { data: orders, error: ordersError } = await supabase
        .from("guest_orders")
        .select("amount_for_guest")
        .eq("visit_guest_id", guestId);

      if (ordersError) throw ordersError;

      const subtotal =
        orders?.reduce((sum, order) => sum + order.amount_for_guest, 0) || 0;
      const serviceCharge = Math.round(subtotal * 0.1);
      const taxAmount = Math.round((subtotal + serviceCharge) * 0.1);
      const total = subtotal + serviceCharge + taxAmount;

      // ゲスト情報を更新
      await supabase
        .from("visit_guests")
        .update({
          individual_subtotal: subtotal,
          individual_service_charge: serviceCharge,
          individual_tax_amount: taxAmount,
          individual_total: total,
        })
        .eq("id", guestId);

      return {
        subtotal,
        serviceCharge,
        taxAmount,
        total,
      };
    } catch (error) {
      logger.error("Error calculating guest bill", error, "VisitGuestService");
      throw error;
    }
  }

  /**
   * 主要ゲストを設定
   */
  static async setPrimaryPayer(
    visitId: string,
    guestId: string
  ): Promise<void> {
    try {
      const supabase = createClient();
      // 既存の主要支払者をリセット
      await supabase
        .from("visit_guests")
        .update({ is_primary_payer: false })
        .eq("visit_id", visitId);

      // 新しい主要支払者を設定
      const { error } = await supabase
        .from("visit_guests")
        .update({ is_primary_payer: true })
        .eq("id", guestId);

      if (error) throw error;
    } catch (error) {
      logger.error("Error setting primary payer", error, "VisitGuestService");
      throw error;
    }
  }
}
