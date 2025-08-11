import { BaseService } from "./base.service";
import { camelToSnake, removeUndefined } from "@/lib/utils/transform";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Customer,
  Visit,
  CreateCustomerData,
  UpdateCustomerData,
  CreateVisitData,
  UpdateVisitData,
  CustomerSearchParams,
} from "@/types/customer.types";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerSearchSchema,
  createVisitSchema,
  updateVisitSchema,
} from "@/lib/validations/customer";

export class CustomerService extends BaseService {
  constructor() {
    super();
  }

  async createCustomer(
    supabase: SupabaseClient<Database>,
    data: CreateCustomerData
  ): Promise<Customer> {
    // Validate input
    const validatedData = createCustomerSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId(supabase);

    const insertData = {
      ...this.toSnakeCase(validatedData),
      created_by: staffId,
      updated_by: staffId,
    };

    const { data: customer, error } = await supabase
      .from("customers")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "顧客の作成に失敗しました")
      );
    }

    return this.mapToCustomer(customer);
  }

  async getCustomerById(
    supabase: SupabaseClient<Database>,
    id: string
  ): Promise<Customer | null> {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(
        this.handleDatabaseError(error, "顧客情報の取得に失敗しました")
      );
    }

    return this.mapToCustomer(data);
  }

  async updateCustomer(
    supabase: SupabaseClient<Database>,
    id: string,
    data: UpdateCustomerData
  ): Promise<Customer> {
    // Validate input
    const validatedData = updateCustomerSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId(supabase);

    const transformedData = removeUndefined(camelToSnake(validatedData));
    const { data: customer, error } = await supabase
      .from("customers")
      .update({
        ...transformedData,
        updated_by: staffId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "顧客情報の更新に失敗しました")
      );
    }

    return this.mapToCustomer(customer);
  }

  async deleteCustomer(
    supabase: SupabaseClient<Database>,
    id: string
  ): Promise<void> {
    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "顧客の削除に失敗しました")
      );
    }
  }

  async searchCustomers(
    supabase: SupabaseClient<Database>,
    params: CustomerSearchParams = {}
  ): Promise<Customer[]> {
    // Validate search parameters
    const validatedParams = customerSearchSchema.parse(params);

    // Use optimized search function if search query is provided
    if (validatedParams.query && validatedParams.query.length >= 2) {
      const { data, error } = await supabase.rpc("search_customers_optimized", {
        search_term: validatedParams.query,
        limit_count: validatedParams.limit ?? 20,
        offset_count: validatedParams.offset ?? 0,
      });

      if (error) {
        console.error("Optimized customer search error:", error);
        // If RPC function doesn't exist, fall back to standard query
        if (error.code === "42883") {
          throw new Error(
            "Required database function is missing. Please run migrations."
          );
        }
        throw new Error(
          this.handleDatabaseError(error, "顧客検索に失敗しました")
        );
      }

      // RPC関数が詳細情報を含めて返すように最適化されたので、直接マップして返す
      interface SearchResult {
        id: string;
        name: string;
        name_kana: string | null;
        phone_number: string | null;
        line_id: string | null;
        birthday: string | null;
        job: string | null;
        memo: string | null;
        source: string | null;
        rank: string | null;
        status: "active" | "vip" | "blocked";
        last_visit_date: string | null;
        created_at: string;
        updated_at: string;
        created_by: string | null;
        updated_by: string | null;
        similarity: number;
      }

      const customers = ((data as SearchResult[]) || [])
        .filter(
          (item) =>
            !validatedParams.status || item.status === validatedParams.status
        )
        .map((item) => this.mapToCustomer(item));

      return customers;
    }

    // If no search query, use standard query
    let query = supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter by status if provided
    if (validatedParams.status) {
      query = query.eq("status", validatedParams.status);
    }

    // Apply pagination
    const offset = validatedParams.offset ?? 0;
    const limit = validatedParams.limit ?? 20;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "顧客検索に失敗しました")
      );
    }

    return data.map((item) => this.mapToCustomer(item));
  }

  async getCustomerVisits(
    supabase: SupabaseClient<Database>,
    customerId: string
  ): Promise<Visit[]> {
    const { data, error } = await supabase
      .from("visits")
      .select("*")
      .eq("customer_id", customerId)
      .order("check_in_at", { ascending: false });

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "来店履歴の取得に失敗しました")
      );
    }

    const visits = data.map((item) => this.mapToVisit(item));

    await this.applyActiveSegmentTableIds(supabase, visits);

    return visits;
  }

  /**
   * List visits for a customer with server-side pagination and optional date range filter
   */
  async listCustomerVisits(
    supabase: SupabaseClient<Database>,
    customerId: string,
    params: {
      limit?: number;
      offset?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{ visits: Visit[]; total: number }> {
    const { limit = 10, offset = 0, startDate, endDate } = params;

    // Build query with count for total
    let query = supabase
      .from("visits")
      .select("*", { count: "exact" })
      .eq("customer_id", customerId);

    if (startDate) {
      query = query.gte("check_in_at", startDate);
    }
    if (endDate) {
      query = query.lte("check_in_at", endDate);
    }

    query = query
      .order("check_in_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "来店履歴の取得に失敗しました")
      );
    }

    const visits = (data || []).map((item) => this.mapToVisit(item));

    await this.applyActiveSegmentTableIds(supabase, visits);

    return { visits, total: count ?? 0 };
  }

  async createVisit(
    supabase: SupabaseClient<Database>,
    data: CreateVisitData
  ): Promise<Visit> {
    // Validate input
    const validatedData = createVisitSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId(supabase);

    const { data: visit, error } = await supabase
      .from("visits")
      .insert({
        customer_id: validatedData.customerId,
        table_id: validatedData.tableId,
        num_guests: validatedData.numGuests,
        check_in_at: validatedData.checkInAt || new Date().toISOString(),
        created_by: staffId,
        updated_by: staffId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "来店記録の作成に失敗しました")
      );
    }

    // Create initial table segment and update table status
    try {
      await supabase.from("visit_table_segments").insert({
        visit_id: visit.id,
        table_id: validatedData.tableId,
        reason: "initial",
        started_at: new Date().toISOString(),
      });
      await supabase
        .from("tables")
        .update({
          current_status: "occupied",
          current_visit_id: visit.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", validatedData.tableId);
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to create initial table segment:", e);
      }
    }

    return this.mapToVisit(visit);
  }

  async updateVisit(
    supabase: SupabaseClient<Database>,
    id: string,
    data: UpdateVisitData
  ): Promise<Visit> {
    // Validate input
    const validatedData = updateVisitSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId(supabase);

    const { data: visit, error } = await supabase
      .from("visits")
      .update({
        ...validatedData,
        table_id: validatedData.tableId,
        check_out_at: validatedData.checkOutAt,
        num_guests: validatedData.numGuests,
        total_amount: validatedData.totalAmount,
        updated_by: staffId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "来店情報の更新に失敗しました")
      );
    }

    // If tableId changed, close existing segment and open a new one
    try {
      if (validatedData.tableId) {
        await supabase
          .from("visit_table_segments")
          .update({ ended_at: new Date().toISOString() })
          .eq("visit_id", id)
          .is("ended_at", null);
        await supabase.from("visit_table_segments").insert({
          visit_id: id,
          table_id: validatedData.tableId,
          reason: "move",
          started_at: new Date().toISOString(),
        });
        // Update table statuses
        await supabase
          .from("tables")
          .update({ current_status: "available", current_visit_id: null })
          .eq("current_visit_id", id);
        await supabase
          .from("tables")
          .update({
            current_status: "occupied",
            current_visit_id: id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", validatedData.tableId);
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Failed to update table segments on visit update:", e);
      }
    }

    return this.mapToVisit(visit);
  }

  async getActiveVisits(supabase: SupabaseClient<Database>): Promise<Visit[]> {
    const { data, error } = await supabase
      .from("visits")
      .select("*")
      .eq("status", "active")
      .order("check_in_at", { ascending: true });

    if (error) {
      throw new Error(
        this.handleDatabaseError(
          error,
          "アクティブな来店情報の取得に失敗しました"
        )
      );
    }

    const visits = data.map((item) => this.mapToVisit(item));

    await this.applyActiveSegmentTableIds(supabase, visits);

    return visits;
  }

  private mapToCustomer(
    data: Database["public"]["Tables"]["customers"]["Row"]
  ): Customer {
    return {
      id: data.id,
      name: data.name,
      nameKana: data.name_kana,
      phoneNumber: data.phone_number,
      lineId: data.line_id,
      birthday: data.birthday,
      memo: data.memo,
      status: data.status,
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
      totalAmount: data.total_amount,
      status: data.status,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * For a set of visits, override tableId with the currently active segment table if present.
   */
  private async applyActiveSegmentTableIds(
    supabase: SupabaseClient<Database>,
    visits: Visit[]
  ): Promise<void> {
    const ids = visits.map((v) => v.id);
    if (ids.length === 0) return;

    const segBuilt = this.applyWhereNull(
      supabase
        .from("visit_table_segments")
        .select("visit_id, table_id")
        .in("visit_id", ids),
      "ended_at"
    );
    const { data: activeSegs } = await segBuilt;
    const visitIdToTableId = new Map<string, number>();
    (activeSegs || []).forEach((s) => {
      visitIdToTableId.set(s.visit_id as string, Number(s.table_id));
    });
    visits.forEach((v) => {
      const t = visitIdToTableId.get(v.id);
      if (t !== undefined) v.tableId = t;
    });
  }
}

// Export singleton instance
export const customerService = new CustomerService();
