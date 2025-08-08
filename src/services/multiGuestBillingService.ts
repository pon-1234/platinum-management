import { Database } from "@/types/database.types";
import { VisitGuestService } from "./visitGuestService";
import { MultiGuestOrderService } from "./multiGuestOrderService";
import { createClient } from "@/lib/supabase/client";

type BillingSplit = Database["public"]["Tables"]["guest_billing_splits"]["Row"];
type VisitGuest = Database["public"]["Tables"]["visit_guests"]["Row"];
type PaymentMethod = "cash" | "card" | "mixed";

export interface IndividualBill {
  guestId: string;
  guest: VisitGuest;
  subtotal: number;
  serviceCharge: number;
  taxAmount: number;
  total: number;
  items: unknown[];
}

export interface GroupBill {
  visitId: string;
  totalAmount: number;
  guestBills: IndividualBill[];
  billingType: "individual" | "split" | "group";
}

export interface BillingSplitInput {
  visit_guest_id: string;
  split_type: "individual" | "shared" | "treated";
  split_amount: number;
  payment_method?: PaymentMethod;
}

export interface PaymentInput {
  payment_method: PaymentMethod;
  amount: number;
  notes?: string;
}

export class MultiGuestBillingService {
  /**
   * Calculate individual bills for all guests in a visit
   */
  static async calculateIndividualBills(
    visitId: string
  ): Promise<IndividualBill[]> {
    try {
      // Get all guests for the visit
      const guests = await VisitGuestService.getVisitGuests(visitId);
      const individualBills: IndividualBill[] = [];

      for (const guest of guests) {
        // Get orders for this guest
        const orders = await MultiGuestOrderService.getGuestOrders(guest.id);

        // Calculate totals
        const subtotal = orders.reduce(
          (sum, order) => sum + order.amount_for_guest,
          0
        );
        const serviceCharge = Math.round(subtotal * 0.1); // 10% service charge
        const taxAmount = Math.round((subtotal + serviceCharge) * 0.1); // 10% tax
        const total = subtotal + serviceCharge + taxAmount;

        // Update guest billing totals
        await VisitGuestService.updateGuestInfo(guest.id, {
          individual_subtotal: subtotal,
          individual_service_charge: serviceCharge,
          individual_tax_amount: taxAmount,
          individual_total: total,
        });

        individualBills.push({
          guestId: guest.id,
          guest: guest,
          subtotal,
          serviceCharge,
          taxAmount,
          total,
          items: orders,
        });
      }

      return individualBills;
    } catch (error) {
      console.error("Error calculating individual bills:", error);
      return [];
    }
  }

  /**
   * Process split billing for multiple guests
   */
  static async processSplitBilling(
    visitId: string,
    splitData: BillingSplitInput[]
  ): Promise<BillingSplit[]> {
    try {
      const createdSplits: BillingSplit[] = [];

      for (const split of splitData) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("guest_billing_splits")
          .insert({
            visit_id: visitId,
            visit_guest_id: split.visit_guest_id,
            split_type: split.split_type,
            split_amount: split.split_amount,
            payment_method: split.payment_method,
            payment_status: "pending",
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating billing split:", error);
          continue;
        }

        createdSplits.push(data);
      }

      return createdSplits;
    } catch (error) {
      console.error("Error in processSplitBilling:", error);
      return [];
    }
  }

  /**
   * Process individual payment for a guest
   */
  static async processIndividualPayment(
    guestId: string,
    paymentData: PaymentInput
  ): Promise<boolean> {
    try {
      // Get the guest's visit
      const supabase = createClient();
      const { data: guest, error: guestError } = await supabase
        .from("visit_guests")
        .select("visit_id, individual_total")
        .eq("id", guestId)
        .single();

      if (guestError || !guest) {
        console.error("Error fetching guest:", guestError);
        return false;
      }

      // Check if billing split already exists
      const { data: existingSplit } = await supabase
        .from("guest_billing_splits")
        .select("id")
        .eq("visit_guest_id", guestId)
        .eq("visit_id", guest.visit_id)
        .single();

      if (existingSplit) {
        // Update existing split
        const { error: updateError } = await supabase
          .from("guest_billing_splits")
          .update({
            split_amount: paymentData.amount,
            payment_method: paymentData.payment_method,
            payment_status: "completed",
            paid_at: new Date().toISOString(),
            notes: paymentData.notes,
          })
          .eq("id", existingSplit.id);

        if (updateError) {
          console.error("Error updating billing split:", updateError);
          return false;
        }
      } else {
        // Create new billing split
        const { error: createError } = await supabase
          .from("guest_billing_splits")
          .insert({
            visit_id: guest.visit_id,
            visit_guest_id: guestId,
            split_type: "individual",
            split_amount: paymentData.amount,
            payment_method: paymentData.payment_method,
            payment_status: "completed",
            paid_at: new Date().toISOString(),
            notes: paymentData.notes,
          });

        if (createError) {
          console.error("Error creating billing split:", createError);
          return false;
        }
      }

      // Check if all guests have paid
      await this.checkAndUpdateVisitPaymentStatus(guest.visit_id);

      return true;
    } catch (error) {
      console.error("Error in processIndividualPayment:", error);
      return false;
    }
  }

  /**
   * Generate a group bill for the entire visit
   */
  static async generateGroupBill(visitId: string): Promise<GroupBill | null> {
    try {
      const individualBills = await this.calculateIndividualBills(visitId);

      const totalAmount = individualBills.reduce(
        (sum, bill) => sum + bill.total,
        0
      );

      // Determine billing type based on payment splits
      const supabase = createClient();
      const { data: splits } = await supabase
        .from("guest_billing_splits")
        .select("split_type")
        .eq("visit_id", visitId);

      let billingType: "individual" | "split" | "group" = "group";
      if (splits && splits.length > 0) {
        const hasIndividual = splits.some((s) => s.split_type === "individual");
        const hasShared = splits.some((s) => s.split_type === "shared");

        if (hasIndividual && !hasShared) {
          billingType = "individual";
        } else if (hasShared) {
          billingType = "split";
        }
      }

      return {
        visitId,
        totalAmount,
        guestBills: individualBills,
        billingType,
      };
    } catch (error) {
      console.error("Error generating group bill:", error);
      return null;
    }
  }

  /**
   * Validate billing consistency for a visit
   */
  static async validateBillingConsistency(visitId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];

      // Get all guests and their totals
      const supabase = createClient();
      const { data: guests, error: guestsError } = await supabase
        .from("visit_guests")
        .select("id, individual_total")
        .eq("visit_id", visitId);

      if (guestsError || !guests) {
        errors.push("Failed to fetch guests");
        return { isValid: false, errors };
      }

      // Get all billing splits
      const { data: splits, error: splitsError } = await supabase
        .from("guest_billing_splits")
        .select("visit_guest_id, split_amount")
        .eq("visit_id", visitId);

      if (splitsError) {
        errors.push("Failed to fetch billing splits");
        return { isValid: false, errors };
      }

      // Check if split amounts match individual totals
      for (const guest of guests) {
        const guestSplits =
          splits?.filter((s) => s.visit_guest_id === guest.id) || [];
        const totalSplit = guestSplits.reduce(
          (sum, s) => sum + s.split_amount,
          0
        );

        if (
          guestSplits.length > 0 &&
          Math.abs(totalSplit - guest.individual_total) > 1
        ) {
          errors.push(
            `Guest ${guest.id} billing mismatch: total ${guest.individual_total}, splits ${totalSplit}`
          );
        }
      }

      // Get visit total
      const { data: visit, error: visitError } = await supabase
        .from("visits")
        .select("total_amount")
        .eq("id", visitId)
        .single();

      if (visitError || !visit) {
        errors.push("Failed to fetch visit total");
        return { isValid: false, errors };
      }

      // Check if sum of individual totals matches visit total
      const sumOfIndividualTotals = guests.reduce(
        (sum, g) => sum + g.individual_total,
        0
      );
      if (
        visit.total_amount &&
        Math.abs(sumOfIndividualTotals - visit.total_amount) > 1
      ) {
        errors.push(
          `Visit total mismatch: visit ${visit.total_amount}, sum of guests ${sumOfIndividualTotals}`
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error("Error validating billing consistency:", error);
      return {
        isValid: false,
        errors: ["Unexpected error during validation"],
      };
    }
  }

  /**
   * Check and update visit payment status based on guest payments
   */
  private static async checkAndUpdateVisitPaymentStatus(
    visitId: string
  ): Promise<void> {
    try {
      // Get all guests
      const supabase = createClient();
      const { data: guests, error: guestsError } = await supabase
        .from("visit_guests")
        .select("id")
        .eq("visit_id", visitId);

      if (guestsError || !guests) return;

      // Get all completed payments
      const { data: completedPayments, error: paymentsError } = await supabase
        .from("guest_billing_splits")
        .select("visit_guest_id")
        .eq("visit_id", visitId)
        .eq("payment_status", "completed");

      if (paymentsError) return;

      const paidGuestIds = new Set(
        completedPayments?.map((p) => p.visit_guest_id) || []
      );
      const allGuestsPaid = guests.every((g) => paidGuestIds.has(g.id));

      if (allGuestsPaid) {
        // Update visit payment status to completed
        await supabase
          .from("visits")
          .update({ payment_status: "completed" })
          .eq("id", visitId);
      }
    } catch (error) {
      console.error("Error updating visit payment status:", error);
    }
  }

  /**
   * Get billing splits for a visit
   */
  static async getVisitBillingSplits(visitId: string): Promise<BillingSplit[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("guest_billing_splits")
        .select("*")
        .eq("visit_id", visitId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching billing splits:", error);
        return [];
      }

      return data;
    } catch (error) {
      console.error("Error in getVisitBillingSplits:", error);
      return [];
    }
  }

  /**
   * Cancel a billing split
   */
  static async cancelBillingSplit(splitId: string): Promise<boolean> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("guest_billing_splits")
        .update({ payment_status: "cancelled" })
        .eq("id", splitId);

      if (error) {
        console.error("Error cancelling billing split:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in cancelBillingSplit:", error);
      return false;
    }
  }
}
