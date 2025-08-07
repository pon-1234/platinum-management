import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";

type VisitGuest = Database["public"]["Tables"]["visit_guests"]["Row"];
type VisitGuestInsert = Database["public"]["Tables"]["visit_guests"]["Insert"];
type VisitGuestUpdate = Database["public"]["Tables"]["visit_guests"]["Update"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

export interface VisitGuestWithCustomer extends VisitGuest {
  customer: Customer;
}

export interface GuestShare {
  guest_id: string;
  percentage: number;
}

export class VisitGuestService {
  /**
   * Add a guest to a visit
   */
  static async addGuestToVisit(
    visitId: string,
    customerId: string,
    guestType: "main" | "companion" | "additional" = "companion",
    additionalData?: Partial<VisitGuestInsert>
  ): Promise<VisitGuest | null> {
    try {
      const { data, error } = await supabase.rpc("add_guest_to_visit", {
        p_visit_id: visitId,
        p_customer_id: customerId,
        p_guest_type: guestType,
        p_seat_position: additionalData?.seat_position || null,
        p_relationship_to_main: additionalData?.relationship_to_main || null,
        p_is_primary_payer: additionalData?.is_primary_payer || false,
        p_created_by: additionalData?.created_by || null,
      });

      if (error) {
        console.error("Error adding guest to visit:", error);
        return null;
      }

      // Fetch the created guest
      const { data: guest, error: fetchError } = await supabase
        .from("visit_guests")
        .select("*")
        .eq("id", data)
        .single();

      if (fetchError) {
        console.error("Error fetching created guest:", fetchError);
        return null;
      }

      return guest;
    } catch (error) {
      console.error("Error in addGuestToVisit:", error);
      return null;
    }
  }

  /**
   * Update guest information
   */
  static async updateGuestInfo(
    guestId: string,
    updateData: VisitGuestUpdate
  ): Promise<VisitGuest | null> {
    try {
      const { data, error } = await supabase
        .from("visit_guests")
        .update(updateData)
        .eq("id", guestId)
        .select()
        .single();

      if (error) {
        console.error("Error updating guest info:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in updateGuestInfo:", error);
      return null;
    }
  }

  /**
   * Get all guests for a visit with customer details
   */
  static async getVisitGuests(
    visitId: string
  ): Promise<VisitGuestWithCustomer[]> {
    try {
      const { data, error } = await supabase
        .from("visit_guests")
        .select(
          `
          *,
          customer:customers(*)
        `
        )
        .eq("visit_id", visitId)
        .order("guest_type", { ascending: false })
        .order("seat_position", { ascending: true });

      if (error) {
        console.error("Error fetching visit guests:", error);
        return [];
      }

      return data as VisitGuestWithCustomer[];
    } catch (error) {
      console.error("Error in getVisitGuests:", error);
      return [];
    }
  }

  /**
   * Check out a specific guest
   */
  static async checkOutGuest(
    guestId: string,
    checkOutTime: Date = new Date()
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("visit_guests")
        .update({
          check_out_time: checkOutTime.toISOString(),
        })
        .eq("id", guestId);

      if (error) {
        console.error("Error checking out guest:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in checkOutGuest:", error);
      return false;
    }
  }

  /**
   * Transfer a guest to a new visit (for table moves)
   */
  static async transferGuestToNewVisit(
    guestId: string,
    newVisitId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("visit_guests")
        .update({ visit_id: newVisitId })
        .eq("id", guestId);

      if (error) {
        console.error("Error transferring guest:", error);
        return false;
      }

      // Update the total_guests count for both visits
      await this.updateVisitGuestCount(newVisitId);

      return true;
    } catch (error) {
      console.error("Error in transferGuestToNewVisit:", error);
      return false;
    }
  }

  /**
   * Update the total guest count for a visit
   */
  static async updateVisitGuestCount(visitId: string): Promise<boolean> {
    try {
      const { data: guestCount, error: countError } = await supabase
        .from("visit_guests")
        .select("id", { count: "exact", head: true })
        .eq("visit_id", visitId);

      if (countError) {
        console.error("Error counting guests:", countError);
        return false;
      }

      const { error: updateError } = await supabase
        .from("visits")
        .update({ total_guests: guestCount?.length || 1 })
        .eq("id", visitId);

      if (updateError) {
        console.error("Error updating visit guest count:", updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in updateVisitGuestCount:", error);
      return false;
    }
  }

  /**
   * Calculate individual guest bill
   */
  static async calculateGuestBill(guestId: string): Promise<{
    subtotal: number;
    service_charge: number;
    tax_amount: number;
    total: number;
  } | null> {
    try {
      const { data, error } = await supabase.rpc("calculate_guest_bill", {
        p_visit_guest_id: guestId,
      });

      if (error) {
        console.error("Error calculating guest bill:", error);
        return null;
      }

      return data[0];
    } catch (error) {
      console.error("Error in calculateGuestBill:", error);
      return null;
    }
  }

  /**
   * Set primary payer for a visit
   */
  static async setPrimaryPayer(
    visitId: string,
    guestId: string
  ): Promise<boolean> {
    try {
      // First, unset all other guests as primary payer
      const { error: unsetError } = await supabase
        .from("visit_guests")
        .update({ is_primary_payer: false })
        .eq("visit_id", visitId);

      if (unsetError) {
        console.error("Error unsetting primary payers:", unsetError);
        return false;
      }

      // Set the specified guest as primary payer
      const { error: setError } = await supabase
        .from("visit_guests")
        .update({ is_primary_payer: true })
        .eq("id", guestId);

      if (setError) {
        console.error("Error setting primary payer:", setError);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in setPrimaryPayer:", error);
      return false;
    }
  }

  /**
   * Get guest by ID with customer details
   */
  static async getGuestById(
    guestId: string
  ): Promise<VisitGuestWithCustomer | null> {
    try {
      const { data, error } = await supabase
        .from("visit_guests")
        .select(
          `
          *,
          customer:customers(*)
        `
        )
        .eq("id", guestId)
        .single();

      if (error) {
        console.error("Error fetching guest:", error);
        return null;
      }

      return data as VisitGuestWithCustomer;
    } catch (error) {
      console.error("Error in getGuestById:", error);
      return null;
    }
  }

  /**
   * Remove a guest from a visit
   */
  static async removeGuest(guestId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("visit_guests")
        .delete()
        .eq("id", guestId);

      if (error) {
        console.error("Error removing guest:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in removeGuest:", error);
      return false;
    }
  }
}
