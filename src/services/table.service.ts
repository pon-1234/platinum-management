import { BaseService } from "./base.service";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  Table,
  TableWithCurrentReservation,
  CreateTableData,
  UpdateTableData,
  TableSearchParams,
  TableStatus,
} from "@/types/reservation.types";
import {
  createTableSchema,
  updateTableSchema,
  updateTableStatusSchema,
  tableSearchSchema,
} from "@/lib/validations/reservation";

export class TableService extends BaseService {
  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {
    super();
  }

  // Table CRUD operations
  async createTable(data: CreateTableData): Promise<Table> {
    // Validate input
    const validatedData = createTableSchema.parse(data);

    const { data: table, error } = await this.supabase
      .from("tables")
      .insert({
        table_name: validatedData.tableName,
        capacity: validatedData.capacity,
        location: validatedData.location || null,
        is_vip: validatedData.isVip ?? false,
        is_active: validatedData.isActive ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "テーブルの作成に失敗しました")
      );
    }

    return this.mapToTable(table);
  }

  async getTableById(id: string): Promise<Table | null> {
    const { data, error } = await this.supabase
      .from("tables")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(
        this.handleDatabaseError(error, "テーブル情報の取得に失敗しました")
      );
    }

    return this.mapToTable(data);
  }

  async getTableWithCurrentReservation(
    id: string
  ): Promise<TableWithCurrentReservation | null> {
    const table = await this.getTableById(id);
    if (!table) {
      return null;
    }

    // Get current reservation if table is reserved
    if (
      table.currentStatus === "reserved" ||
      table.currentStatus === "occupied"
    ) {
      const { data: reservations } = await this.supabase
        .from("reservations")
        .select("*")
        .eq("table_id", id)
        .in("status", ["confirmed", "checked_in"])
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true })
        .limit(1);

      if (reservations && reservations.length > 0) {
        return {
          ...table,
          currentReservation: {
            id: reservations[0].id,
            customerId: reservations[0].customer_id,
            tableId: reservations[0].table_id,
            reservationDate: reservations[0].reservation_date,
            reservationTime: reservations[0].reservation_time,
            numberOfGuests: reservations[0].number_of_guests,
            assignedCastId: reservations[0].assigned_cast_id,
            specialRequests: reservations[0].special_requests,
            status: reservations[0].status,
            checkedInAt: reservations[0].checked_in_at,
            cancelledAt: reservations[0].cancelled_at,
            cancelReason: reservations[0].cancel_reason,
            createdBy: reservations[0].created_by,
            updatedBy: reservations[0].updated_by,
            createdAt: reservations[0].created_at,
            updatedAt: reservations[0].updated_at,
          },
        };
      }
    }

    return {
      ...table,
      currentReservation: null,
    };
  }

  async updateTable(id: string, data: UpdateTableData): Promise<Table> {
    // Validate input
    const validatedData = updateTableSchema.parse(data);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, unknown> = {
      ...validatedData,
    };

    // Map camelCase to snake_case
    if (validatedData.tableName !== undefined)
      updateData.table_name = validatedData.tableName;
    if (validatedData.isVip !== undefined)
      updateData.is_vip = validatedData.isVip;
    if (validatedData.isActive !== undefined)
      updateData.is_active = validatedData.isActive;
    if (validatedData.currentStatus !== undefined)
      updateData.current_status = validatedData.currentStatus;
    if (validatedData.currentVisitId !== undefined)
      updateData.current_visit_id = validatedData.currentVisitId;

    // Remove camelCase properties
    delete updateData.tableName;
    delete updateData.isVip;
    delete updateData.isActive;
    delete updateData.currentStatus;
    delete updateData.currentVisitId;

    const { data: table, error } = await this.supabase
      .from("tables")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "テーブル情報の更新に失敗しました")
      );
    }

    return this.mapToTable(table);
  }

  async deleteTable(id: string): Promise<void> {
    const { error } = await this.supabase.from("tables").delete().eq("id", id);

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "テーブルの削除に失敗しました")
      );
    }
  }

  async searchTables(params: TableSearchParams = {}): Promise<Table[]> {
    // Validate search parameters
    const validatedParams = tableSearchSchema.parse(params);

    let query = this.supabase
      .from("tables")
      .select("*")
      .order("table_name", { ascending: true });

    // Add filters
    if (validatedParams.status !== undefined) {
      query = query.eq("current_status", validatedParams.status);
    }
    if (validatedParams.isVip !== undefined) {
      query = query.eq("is_vip", validatedParams.isVip);
    }
    if (validatedParams.isActive !== undefined) {
      query = query.eq("is_active", validatedParams.isActive);
    }
    if (validatedParams.minCapacity !== undefined) {
      query = query.gte("capacity", validatedParams.minCapacity);
    }
    if (validatedParams.maxCapacity !== undefined) {
      query = query.lte("capacity", validatedParams.maxCapacity);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        this.handleDatabaseError(error, "テーブル検索に失敗しました")
      );
    }

    return data?.map(this.mapToTable) || [];
  }

  // Table status management
  async updateTableStatus(
    id: string,
    status: TableStatus,
    visitId?: string | null
  ): Promise<Table> {
    // Validate input
    const validatedData = updateTableStatusSchema.parse({
      status,
      visitId,
    });

    return this.updateTable(id, {
      currentStatus: validatedData.status,
      currentVisitId: validatedData.visitId,
    });
  }

  async setTableAvailable(id: string): Promise<Table> {
    return this.updateTableStatus(id, "available", null);
  }

  async setTableCleaning(id: string): Promise<Table> {
    return this.updateTableStatus(id, "cleaning", null);
  }

  async getAvailableTables(
    capacity?: number,
    date?: string,
    time?: string
  ): Promise<Table[]> {
    // Get all active tables
    let tables = await this.searchTables({
      isActive: true,
      minCapacity: capacity,
    });

    // If date and time are provided, filter out reserved tables
    if (date && time) {
      const availableTableIds: string[] = [];

      for (const table of tables) {
        const isAvailable = await this.supabase.rpc(
          "check_table_availability",
          {
            p_table_id: table.id,
            p_reservation_date: date,
            p_reservation_time: time,
          }
        );

        if (isAvailable.data) {
          availableTableIds.push(table.id);
        }
      }

      tables = tables.filter((table) => availableTableIds.includes(table.id));
    } else {
      // If no date/time provided, only return currently available tables
      tables = tables.filter((table) => table.currentStatus === "available");
    }

    return tables;
  }

  // Realtime subscriptions
  subscribeToTableUpdates(callback: (table: Table) => void): () => void {
    this.realtimeChannel = this.supabase
      .channel("table-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
        },
        (payload) => {
          if (payload.new) {
            const table = this.mapToTable(
              payload.new as Database["public"]["Tables"]["tables"]["Row"]
            );
            callback(table);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      if (this.realtimeChannel) {
        this.supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
    };
  }

  subscribeToAllTableUpdates(callback: (tables: Table[]) => void): () => void {
    // Initial load
    this.searchTables({ isActive: true }).then(callback);

    this.realtimeChannel = this.supabase
      .channel("all-table-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
        },
        async () => {
          // Reload all tables when any change occurs
          const tables = await this.searchTables({ isActive: true });
          callback(tables);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      if (this.realtimeChannel) {
        this.supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
    };
  }

  // Helper methods
  private mapToTable(
    data: Database["public"]["Tables"]["tables"]["Row"]
  ): Table {
    return {
      id: data.id,
      tableName: data.table_name,
      capacity: data.capacity,
      location: data.location,
      isVip: data.is_vip,
      isActive: data.is_active,
      currentStatus: data.current_status,
      currentVisitId: data.current_visit_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// Export singleton instance
export const tableService = new TableService();
