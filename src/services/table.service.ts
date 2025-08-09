import { BaseService } from "./base.service";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
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
  private supabase: SupabaseClient<Database>;
  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {
    super();
    this.supabase = createClient();
  }

  // Table CRUD operations
  async createTable(data: CreateTableData): Promise<Table> {
    // Validate input
    const validatedData = createTableSchema.parse(data);

    const { data: table, error } = await this.supabase
      .from("tables")
      .insert({
        table_number: validatedData.tableName,
        capacity: validatedData.capacity,
        location: validatedData.location || null,
        is_available: true, // 新規作成時は利用可能
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

    // visit_table_segmentsから現在アクティブな来店を取得
    const tableIdNumber = parseInt(id, 10);
    if (!isNaN(tableIdNumber)) {
      const { data: activeSegment } = await this.supabase
        .from("visit_table_segments")
        .select(
          `
          *,
          visits(
            id,
            customer_id,
            num_guests,
            check_in_at,
            status
          )
        `
        )
        .eq("table_id", tableIdNumber)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (activeSegment?.visits) {
        // アクティブな来店がある場合、テーブルは使用中
        return {
          ...table,
          currentStatus: "occupied",
          currentVisitId: activeSegment.visit_id,
          currentReservation: null, // visitとreservationは別概念
        };
      }
    }

    // 予約情報のチェック（既存ロジック）
    if (table.currentStatus === "reserved") {
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
      updateData.table_number = validatedData.tableName;
    if (validatedData.isActive !== undefined)
      updateData.is_active = validatedData.isActive;
    if (validatedData.currentStatus !== undefined)
      updateData.current_status = validatedData.currentStatus;
    if (validatedData.currentVisitId !== undefined)
      updateData.current_visit_id = validatedData.currentVisitId;

    // Remove camelCase properties
    delete updateData.tableName;
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
      .order("table_number", { ascending: true });

    // Add filters
    if (validatedParams.search) {
      query = query.ilike("table_number", `%${validatedParams.search}%`);
    }
    if (validatedParams.status !== undefined) {
      query = query.eq("current_status", validatedParams.status);
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

    return data?.map((item) => this.mapToTable(item)) || [];
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

    // 新しいvisit_table_segmentsベースの更新
    if (visitId && status === "occupied") {
      // テーブルが使用中になった場合、visit_table_segmentsに記録
      const tableIdNumber = parseInt(id, 10);
      if (!isNaN(tableIdNumber)) {
        // 既存のアクティブなセグメントを終了
        await this.supabase
          .from("visit_table_segments")
          .update({ ended_at: new Date().toISOString() })
          .eq("table_id", tableIdNumber)
          .is("ended_at", null);

        // 新しいセグメントを作成
        await this.supabase.from("visit_table_segments").insert({
          visit_id: visitId,
          table_id: tableIdNumber,
          reason: "check_in",
          started_at: new Date().toISOString(),
        });
      }
    } else if (status === "available") {
      // テーブルが空席になった場合、アクティブなセグメントを終了
      const tableIdNumber = parseInt(id, 10);
      if (!isNaN(tableIdNumber)) {
        await this.supabase
          .from("visit_table_segments")
          .update({ ended_at: new Date().toISOString() })
          .eq("table_id", tableIdNumber)
          .is("ended_at", null);
      }
    }

    // 既存のtablesテーブルも更新（互換性のため）
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
    // 日時が指定されている場合は一括チェック用のRPCを使用
    if (date && time) {
      const { data: availableTableIds, error } = await this.supabase.rpc(
        "get_available_tables",
        {
          p_reservation_date: date,
          p_reservation_time: time,
          p_min_capacity: capacity || 1,
        }
      );

      if (error) {
        // RPCが存在しない場合は従来の方法でフォールバック
        console.warn(
          "RPC get_available_tablesが存在しません。従来の方法で処理します。"
        );

        const tables = await this.searchTables({
          isActive: true,
          minCapacity: capacity,
        });

        const availableTableIdsList: string[] = [];
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
            availableTableIdsList.push(table.id);
          }
        }

        return tables.filter((table) =>
          availableTableIdsList.includes(table.id)
        );
      }

      // RPCが成功した場合、返されたIDでテーブルを取得
      if (availableTableIds && availableTableIds.length > 0) {
        const { data: tablesData, error: tableError } = await this.supabase
          .from("tables")
          .select("*")
          .in("id", availableTableIds)
          .eq("is_active", true);

        if (tableError) {
          throw new Error(
            `テーブル情報の取得に失敗しました: ${tableError.message}`
          );
        }

        return (tablesData || []).map(this.mapToTable);
      }

      return [];
    }

    // 日時が指定されていない場合は単純にアクティブなテーブルを返す
    return await this.searchTables({
      isActive: true,
      minCapacity: capacity,
    });
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
    console.warn(
      "subscribeToAllTableUpdates is deprecated. Use subscribeToTableUpdatesDifferential for better performance."
    );
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

  // Optimized differential update subscription
  subscribeToTableUpdatesDifferential(
    onUpdate: (updatedTable: Table) => void,
    onDelete: (tableId: string) => void,
    onInitialLoad: (allTables: Table[]) => void
  ): () => void {
    // Initial load with visit_table_segments status
    this.getTablesWithActiveVisits().then(onInitialLoad);

    this.realtimeChannel = this.supabase
      .channel("table-differential-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tables",
        },
        (payload) => {
          const table = this.mapToTable(
            payload.new as Database["public"]["Tables"]["tables"]["Row"]
          );
          onUpdate(table);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tables",
        },
        (payload) => {
          const table = this.mapToTable(
            payload.new as Database["public"]["Tables"]["tables"]["Row"]
          );
          onUpdate(table);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "tables",
        },
        (payload) => {
          const oldData =
            payload.old as Database["public"]["Tables"]["tables"]["Row"];
          onDelete(oldData.id);
        }
      )
      // visit_table_segmentsの変更も監視
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visit_table_segments",
        },
        async (payload) => {
          // セグメントが変更されたテーブルの情報を更新
          const tableId =
            (payload.new as any)?.table_id || (payload.old as any)?.table_id;
          if (tableId) {
            const updatedTable = await this.getTableWithActiveVisit(
              String(tableId)
            );
            if (updatedTable) {
              onUpdate(updatedTable);
            }
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

  // 新しいヘルパーメソッド：アクティブな来店情報を含むテーブルリストを取得
  private async getTablesWithActiveVisits(): Promise<Table[]> {
    const { data: tables } = await this.supabase
      .from("tables")
      .select(
        `
        *,
        visit_table_segments!left(
          visit_id,
          ended_at
        )
      `
      )
      .eq("is_active", true)
      .order("display_order");

    if (!tables) return [];

    return tables.map((table) => {
      // アクティブなセグメントを見つける
      const activeSegment = (table.visit_table_segments as any[])?.find(
        (seg) => seg.ended_at === null
      );

      return this.mapToTable({
        ...table,
        current_status: activeSegment ? "occupied" : table.current_status,
        current_visit_id: activeSegment?.visit_id || table.current_visit_id,
      });
    });
  }

  // 新しいヘルパーメソッド：特定のテーブルのアクティブな来店情報を取得
  private async getTableWithActiveVisit(
    tableId: string
  ): Promise<Table | null> {
    const { data: table } = await this.supabase
      .from("tables")
      .select(
        `
        *,
        visit_table_segments!left(
          visit_id,
          ended_at
        )
      `
      )
      .eq("id", tableId)
      .single();

    if (!table) return null;

    const activeSegment = (table.visit_table_segments as any[])?.find(
      (seg) => seg.ended_at === null
    );

    return this.mapToTable({
      ...table,
      current_status: activeSegment ? "occupied" : table.current_status,
      current_visit_id: activeSegment?.visit_id || table.current_visit_id,
    });
  }

  // Helper methods
  private mapToTable(
    data: Database["public"]["Tables"]["tables"]["Row"]
  ): Table {
    return {
      id: data.id,
      tableName: data.table_number,
      capacity: data.capacity,
      location: data.location,
      isAvailable: data.is_available,
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
