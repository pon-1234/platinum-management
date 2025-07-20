import { BaseService } from "./base.service";
import { camelToSnake, removeUndefined } from "@/lib/utils/transform";
import type { Database } from "@/types/database.types";
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

  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    // Validate input
    const validatedData = createCustomerSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId();

    const { data: customer, error } = await this.supabase
      .from("customers")
      .insert({
        name: validatedData.name,
        name_kana: validatedData.nameKana || null,
        phone_number: validatedData.phoneNumber || null,
        line_id: validatedData.lineId || null,
        birthday: validatedData.birthday || null,
        memo: validatedData.memo || null,
        status: validatedData.status,
        created_by: staffId,
        updated_by: staffId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "顧客の作成に失敗しました")
      );
    }

    return this.mapToCustomer(customer);
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
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
    id: string,
    data: UpdateCustomerData
  ): Promise<Customer> {
    // Validate input
    const validatedData = updateCustomerSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId();

    const transformedData = removeUndefined(camelToSnake(validatedData));
    const { data: customer, error } = await this.supabase
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

  async deleteCustomer(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "顧客の削除に失敗しました")
      );
    }
  }

  async searchCustomers(
    params: CustomerSearchParams = {}
  ): Promise<Customer[]> {
    // Validate search parameters
    const validatedParams = customerSearchSchema.parse(params);

    let query = this.supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    // Add search query if provided
    if (validatedParams.query) {
      // Search across multiple fields
      query = query.or(
        `name.ilike.%${validatedParams.query}%,` +
          `name_kana.ilike.%${validatedParams.query}%,` +
          `phone_number.ilike.%${validatedParams.query}%,` +
          `line_id.ilike.%${validatedParams.query}%`
      );
    }

    // Filter by status if provided
    if (validatedParams.status) {
      query = query.eq("status", validatedParams.status);
    }

    // Apply pagination
    query = query.range(
      validatedParams.offset,
      validatedParams.offset + validatedParams.limit - 1
    );

    const { data, error } = await query;

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "顧客検索に失敗しました")
      );
    }

    return data.map(this.mapToCustomer);
  }

  async getCustomerVisits(customerId: string): Promise<Visit[]> {
    const { data, error } = await this.supabase
      .from("visits")
      .select("*")
      .eq("customer_id", customerId)
      .order("check_in_at", { ascending: false });

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "来店履歴の取得に失敗しました")
      );
    }

    return data.map(this.mapToVisit);
  }

  async createVisit(data: CreateVisitData): Promise<Visit> {
    // Validate input
    const validatedData = createVisitSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId();

    const { data: visit, error } = await this.supabase
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

    return this.mapToVisit(visit);
  }

  async updateVisit(id: string, data: UpdateVisitData): Promise<Visit> {
    // Validate input
    const validatedData = updateVisitSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId();

    const { data: visit, error } = await this.supabase
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

    return this.mapToVisit(visit);
  }

  async getActiveVisits(): Promise<Visit[]> {
    const { data, error } = await this.supabase
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

    return data.map(this.mapToVisit);
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
}
