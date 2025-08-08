import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { VisitGuestService } from "./visit-guest.service";
import { MultiGuestOrderService } from "./multi-guest-order.service";

type BillingSplit = Database["public"]["Tables"]["guest_billing_splits"]["Row"];
type BillingSplitInsert =
  Database["public"]["Tables"]["guest_billing_splits"]["Insert"];
type VisitGuest = Database["public"]["Tables"]["visit_guests"]["Row"];
type PaymentMethod = Database["public"]["Enums"]["payment_method"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export interface IndividualBill {
  guestId: string;
  guest: VisitGuest;
  subtotal: number;
  serviceCharge: number;
  taxAmount: number;
  total: number;
  orders: any[];
}

export interface GroupBill {
  visitId: string;
  totalAmount: number;
  individualBills: IndividualBill[];
  billingType: "individual" | "split" | "group";
}

export interface BillingSplitInput {
  guestId: string;
  amount: number;
  paymentMethod?: PaymentMethod;
}

export interface PaymentInput {
  paymentMethod: PaymentMethod;
  amount: number;
  notes?: string;
}

export class MultiGuestBillingService {
  /**
   * 個別会計を計算
   */
  static async calculateIndividualBills(
    visitId: string
  ): Promise<IndividualBill[]> {
    try {
      // 全ゲストを取得
      const guests = await VisitGuestService.getVisitGuests(visitId);
      const individualBills: IndividualBill[] = [];

      for (const guest of guests) {
        // 各ゲストの注文を取得
        const orders = await MultiGuestOrderService.getGuestOrders(guest.id);

        // 会計を計算
        const bill = await VisitGuestService.calculateGuestBill(guest.id);

        individualBills.push({
          guestId: guest.id,
          guest: guest,
          subtotal: bill.subtotal,
          serviceCharge: bill.serviceCharge,
          taxAmount: bill.taxAmount,
          total: bill.total,
          orders: orders,
        });
      }

      return individualBills;
    } catch (error) {
      console.error("Error calculating individual bills:", error);
      throw error;
    }
  }

  /**
   * 分割会計を処理
   */
  static async processSplitBilling(
    visitId: string,
    splitData: BillingSplitInput[]
  ): Promise<BillingSplit[]> {
    try {
      const billingSplits: BillingSplit[] = [];

      for (const split of splitData) {
        const { data, error } = await supabase
          .from("guest_billing_splits")
          .insert({
            visit_id: visitId,
            visit_guest_id: split.guestId,
            split_type: "individual",
            split_amount: split.amount,
            payment_method: split.paymentMethod,
            payment_status: "pending",
          })
          .select()
          .single();

        if (error) throw error;
        billingSplits.push(data);
      }

      return billingSplits;
    } catch (error) {
      console.error("Error processing split billing:", error);
      throw error;
    }
  }

  /**
   * 個別支払いを処理
   */
  static async processIndividualPayment(
    guestId: string,
    paymentData: PaymentInput
  ): Promise<void> {
    try {
      // ゲスト情報を取得
      const { data: guest, error: guestError } = await supabase
        .from("visit_guests")
        .select("visit_id, individual_total")
        .eq("id", guestId)
        .single();

      if (guestError) throw guestError;

      // 支払い記録を作成または更新
      const { error } = await supabase.from("guest_billing_splits").upsert({
        visit_id: guest.visit_id,
        visit_guest_id: guestId,
        split_type: "individual",
        split_amount: paymentData.amount,
        payment_method: paymentData.paymentMethod,
        payment_status: "completed",
        paid_at: new Date().toISOString(),
        notes: paymentData.notes,
      });

      if (error) throw error;

      // ゲストのチェックアウト時間を更新
      if (paymentData.amount >= guest.individual_total) {
        await VisitGuestService.checkOutGuest(guestId);
      }
    } catch (error) {
      console.error("Error processing individual payment:", error);
      throw error;
    }
  }

  /**
   * グループ会計を生成
   */
  static async generateGroupBill(visitId: string): Promise<GroupBill> {
    try {
      const individualBills = await this.calculateIndividualBills(visitId);

      const totalAmount = individualBills.reduce(
        (sum, bill) => sum + bill.total,
        0
      );

      // 会計タイプを判定
      const { data: splits, error } = await supabase
        .from("guest_billing_splits")
        .select("*")
        .eq("visit_id", visitId);

      if (error) throw error;

      let billingType: "individual" | "split" | "group" = "group";
      if (splits && splits.length > 0) {
        const uniqueGuests = new Set(splits.map((s) => s.visit_guest_id));
        if (uniqueGuests.size > 1) {
          billingType = "split";
        } else if (uniqueGuests.size === 1) {
          billingType = "individual";
        }
      }

      return {
        visitId,
        totalAmount,
        individualBills,
        billingType,
      };
    } catch (error) {
      console.error("Error generating group bill:", error);
      throw error;
    }
  }

  /**
   * 会計の整合性を検証
   */
  static async validateBillingConsistency(visitId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];

      // 全ゲストの個別会計を取得
      const individualBills = await this.calculateIndividualBills(visitId);
      const totalFromBills = individualBills.reduce(
        (sum, bill) => sum + bill.total,
        0
      );

      // 来店の合計金額を取得
      const { data: visit, error: visitError } = await supabase
        .from("visits")
        .select("total_amount")
        .eq("id", visitId)
        .single();

      if (visitError) throw visitError;

      // 金額の整合性をチェック
      if (Math.abs(totalFromBills - visit.total_amount) > 1) {
        errors.push(
          `個別会計の合計 (${totalFromBills}) が来店合計 (${visit.total_amount}) と一致しません`
        );
      }

      // 支払い状況をチェック
      const { data: splits, error: splitsError } = await supabase
        .from("guest_billing_splits")
        .select("*")
        .eq("visit_id", visitId);

      if (splitsError) throw splitsError;

      const totalPaid =
        splits?.reduce(
          (sum, split) =>
            split.payment_status === "completed"
              ? sum + split.split_amount
              : sum,
          0
        ) || 0;

      if (totalPaid < totalFromBills) {
        errors.push(`未払い金額があります: ${totalFromBills - totalPaid}円`);
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error("Error validating billing consistency:", error);
      throw error;
    }
  }

  /**
   * 部分会計を処理（一部ゲストのみ会計）
   */
  static async processPartialCheckout(
    visitId: string,
    guestIds: string[],
    paymentMethod: PaymentMethod
  ): Promise<void> {
    try {
      for (const guestId of guestIds) {
        // ゲストの会計を計算
        const bill = await VisitGuestService.calculateGuestBill(guestId);

        // 支払い処理
        await this.processIndividualPayment(guestId, {
          paymentMethod,
          amount: bill.total,
        });
      }

      // 残りのゲストがいるか確認
      const { data: remainingGuests, error } = await supabase
        .from("visit_guests")
        .select("id")
        .eq("visit_id", visitId)
        .is("check_out_time", null);

      if (error) throw error;

      // 全員がチェックアウトした場合は来店を完了
      if (!remainingGuests || remainingGuests.length === 0) {
        await supabase
          .from("visits")
          .update({
            status: "completed",
            check_out_at: new Date().toISOString(),
            payment_status: "completed",
          })
          .eq("id", visitId);
      }
    } catch (error) {
      console.error("Error processing partial checkout:", error);
      throw error;
    }
  }

  /**
   * 会計を均等分割
   */
  static async splitBillEvenly(
    visitId: string,
    guestIds: string[],
    paymentMethod?: PaymentMethod
  ): Promise<BillingSplit[]> {
    try {
      // 合計金額を取得
      const groupBill = await this.generateGroupBill(visitId);
      const amountPerGuest = Math.ceil(groupBill.totalAmount / guestIds.length);

      const splitData: BillingSplitInput[] = guestIds.map((guestId) => ({
        guestId,
        amount: amountPerGuest,
        paymentMethod,
      }));

      return await this.processSplitBilling(visitId, splitData);
    } catch (error) {
      console.error("Error splitting bill evenly:", error);
      throw error;
    }
  }
}
