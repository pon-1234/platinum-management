import { createClient } from "@/lib/supabase/server";

export class VisitSessionServerService {
  static async createSession(
    tableId: number,
    customerId: string,
    numGuests: number = 1
  ): Promise<{ visitId: string }> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("認証されていません");

    const sessionCode = `V${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${Math.random()
      .toString(36)
      .substr(2, 4)
      .toUpperCase()}`;

    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .insert({
        customer_id: customerId,
        primary_customer_id: customerId,
        table_id: tableId,
        num_guests: numGuests,
        is_group_visit: numGuests > 1,
        session_code: sessionCode,
        status: "active",
      })
      .select()
      .single();
    if (visitError) throw visitError;

    const { error: segmentError } = await supabase
      .from("visit_table_segments")
      .insert({
        visit_id: visit.id,
        table_id: tableId,
        reason: "initial",
        started_at: new Date().toISOString(),
      });
    if (segmentError) throw segmentError;

    const { error: tableUpdateError } = await supabase
      .from("tables")
      .update({
        current_status: "occupied",
        current_visit_id: visit.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tableId);
    if (tableUpdateError) throw tableUpdateError;

    return { visitId: visit.id };
  }

  static async endSession(visitId: string): Promise<void> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("認証されていません");

    const { error: segmentError } = await supabase
      .from("visit_table_segments")
      .update({ ended_at: new Date().toISOString() })
      .eq("visit_id", visitId)
      .is("ended_at", null);
    if (segmentError) throw segmentError;

    const { error: visitError } = await supabase
      .from("visits")
      .update({
        status: "completed",
        check_out_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", visitId);
    if (visitError) throw visitError;

    const { error: tableError } = await supabase
      .from("tables")
      .update({
        current_status: "available",
        current_visit_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("current_visit_id", visitId);
    if (tableError) throw tableError;
  }

  static async moveTable(visitId: string, newTableId: number): Promise<void> {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("認証されていません");

    // Use authoritative DB RPC for table move to keep logic centralized
    const { error } = await supabase.rpc("move_visit_table", {
      p_visit_id: visitId,
      p_from_table_id: null, // let RPC infer from current state when null
      p_to_table_id: newTableId,
      p_reason: "move",
    });
    if (error) throw error;
  }
}
