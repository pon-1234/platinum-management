import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  Reservation,
  ReservationWithDetails,
  CreateReservationData,
  UpdateReservationData,
  ReservationSearchParams,
  Table,
} from "@/types/reservation.types";
import {
  createReservationSchema,
  updateReservationSchema,
  checkInReservationSchema,
  cancelReservationSchema,
  reservationSearchSchema,
} from "@/lib/validations/reservation";
import { TableService } from "./table.service";

export class ReservationService {
  private supabase: SupabaseClient<Database>;
  private tableService: TableService;

  constructor() {
    this.supabase = createClient();
    this.tableService = new TableService();
  }

  // Reservation CRUD operations
  async createReservation(data: CreateReservationData): Promise<Reservation> {
    try {
      // Validate input
      const validatedData = createReservationSchema.parse(data);

      // Get current user's staff ID
      const staffId = await this.getCurrentStaffId();

      // Check table availability if table is specified
      if (validatedData.tableId) {
        const isAvailable = await this.checkTableAvailability(
          validatedData.tableId,
          validatedData.reservationDate,
          validatedData.reservationTime
        );

        if (!isAvailable) {
          throw new Error("指定されたテーブルは予約できません");
        }
      }

      const { data: reservation, error } = await this.supabase
        .from("reservations")
        .insert({
          customer_id: validatedData.customerId,
          table_id: validatedData.tableId || null,
          reservation_date: validatedData.reservationDate,
          reservation_time: validatedData.reservationTime,
          number_of_guests: validatedData.numberOfGuests,
          assigned_cast_id: validatedData.assignedCastId || null,
          special_requests: validatedData.specialRequests || null,
          status: validatedData.status || "pending",
          created_by: staffId,
          updated_by: staffId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`予約の作成に失敗しました: ${error.message}`);
      }

      return this.mapToReservation(reservation);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("createReservation failed:", error);
      }
      throw error;
    }
  }

  async getReservationById(id: string): Promise<Reservation | null> {
    try {
      const { data, error } = await this.supabase
        .from("reservations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw new Error(`予約情報の取得に失敗しました: ${error.message}`);
      }

      return this.mapToReservation(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getReservationById failed:", error);
      }
      throw error;
    }
  }

  async getReservationWithDetails(
    id: string
  ): Promise<ReservationWithDetails | null> {
    const { data, error } = await this.supabase
      .from("reservations")
      .select(
        `
        *,
        customer:customers(id, name, phone_number),
        table:tables(*),
        assigned_cast:staffs!assigned_cast_id(
          id,
          full_name,
          casts_profile!casts_profile_staff_id_fkey(stage_name)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`予約詳細の取得に失敗しました: ${error.message}`);
    }

    return this.mapToReservationWithDetails(data);
  }

  async updateReservation(
    id: string,
    data: UpdateReservationData
  ): Promise<Reservation> {
    // Validate input
    const validatedData = updateReservationSchema.parse(data);

    // Get current user's staff ID
    const staffId = await this.getCurrentStaffId();

    // Check table availability if table is being changed
    if (validatedData.tableId !== undefined) {
      const currentReservation = await this.getReservationById(id);
      if (!currentReservation) {
        throw new Error("予約が見つかりません");
      }

      if (
        validatedData.tableId &&
        validatedData.tableId !== currentReservation.tableId
      ) {
        const isAvailable = await this.checkTableAvailability(
          validatedData.tableId,
          validatedData.reservationDate || currentReservation.reservationDate,
          validatedData.reservationTime || currentReservation.reservationTime,
          id
        );

        if (!isAvailable) {
          throw new Error("指定されたテーブルは予約できません");
        }
      }
    }

    // Map camelCase to snake_case using Object.fromEntries for cleaner code
    const fieldMappings = {
      customerId: "customer_id",
      tableId: "table_id",
      reservationDate: "reservation_date",
      reservationTime: "reservation_time",
      numberOfGuests: "number_of_guests",
      assignedCastId: "assigned_cast_id",
      specialRequests: "special_requests",
      checkedInAt: "checked_in_at",
      cancelledAt: "cancelled_at",
      cancelReason: "cancel_reason",
    } as const;

    const updateData = Object.fromEntries(
      Object.entries(validatedData)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => {
          const mappedKey =
            fieldMappings[key as keyof typeof fieldMappings] || key;
          return [mappedKey, value];
        })
    );

    updateData.updated_by = staffId;

    const { data: reservation, error } = await this.supabase
      .from("reservations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`予約情報の更新に失敗しました: ${error.message}`);
    }

    return this.mapToReservation(reservation);
  }

  async deleteReservation(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("reservations")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`予約の削除に失敗しました: ${error.message}`);
    }
  }

  async searchReservations(
    params: ReservationSearchParams = {}
  ): Promise<Reservation[]> {
    // Validate search parameters
    const validatedParams = reservationSearchSchema.parse(params);

    let query = this.supabase
      .from("reservations")
      .select(
        `
        *,
        customer:customers(
          id,
          name,
          phone_number
        ),
        table:tables(
          id,
          table_name,
          capacity,
          location
        ),
        assigned_cast:staffs!assigned_cast_id(
          id,
          full_name,
          casts_profile!casts_profile_staff_id_fkey(stage_name)
        )
      `
      )
      .order("reservation_date", { ascending: true })
      .order("reservation_time", { ascending: true });

    // Add filters
    if (validatedParams.customerId) {
      query = query.eq("customer_id", validatedParams.customerId);
    }
    if (validatedParams.tableId) {
      query = query.eq("table_id", validatedParams.tableId);
    }
    if (validatedParams.assignedCastId) {
      query = query.eq("assigned_cast_id", validatedParams.assignedCastId);
    }
    if (validatedParams.status) {
      query = query.eq("status", validatedParams.status);
    }
    if (validatedParams.startDate) {
      query = query.gte("reservation_date", validatedParams.startDate);
    }
    if (validatedParams.endDate) {
      query = query.lte("reservation_date", validatedParams.endDate);
    }

    // Apply pagination
    query = query.range(
      validatedParams.offset,
      validatedParams.offset + validatedParams.limit - 1
    );

    const { data, error } = await query;

    if (error) {
      throw new Error(`予約検索に失敗しました: ${error.message}`);
    }

    return data.map(this.mapToReservation);
  }

  async searchReservationsWithDetails(
    params: ReservationSearchParams = {}
  ): Promise<ReservationWithDetails[]> {
    // Validate search parameters
    const validatedParams = reservationSearchSchema.parse(params);

    let query = this.supabase
      .from("reservations")
      .select(
        `
        *,
        customer:customers(id, name, phone_number),
        table:tables(*),
        assigned_cast:staffs!assigned_cast_id(
          id,
          full_name,
          casts_profile!casts_profile_staff_id_fkey(stage_name)
        )
      `
      )
      .order("reservation_date", { ascending: true })
      .order("reservation_time", { ascending: true });

    // Add filters
    if (validatedParams.customerId) {
      query = query.eq("customer_id", validatedParams.customerId);
    }
    if (validatedParams.tableId) {
      query = query.eq("table_id", validatedParams.tableId);
    }
    if (validatedParams.assignedCastId) {
      query = query.eq("assigned_cast_id", validatedParams.assignedCastId);
    }
    if (validatedParams.status) {
      query = query.eq("status", validatedParams.status);
    }
    if (validatedParams.startDate) {
      query = query.gte("reservation_date", validatedParams.startDate);
    }
    if (validatedParams.endDate) {
      query = query.lte("reservation_date", validatedParams.endDate);
    }

    // Apply pagination
    query = query.range(
      validatedParams.offset,
      validatedParams.offset + validatedParams.limit - 1
    );

    const { data, error } = await query;

    if (error) {
      throw new Error(`予約検索に失敗しました: ${error.message}`);
    }

    return data.map((item) => this.mapToReservationWithDetails(item));
  }

  // Reservation actions
  async checkInReservation(id: string, tableId: string): Promise<Reservation> {
    // Validate input
    const validatedData = checkInReservationSchema.parse({ tableId });

    // Check if table is available
    const reservation = await this.getReservationById(id);
    if (!reservation) {
      throw new Error("予約が見つかりません");
    }

    if (
      reservation.status !== "confirmed" &&
      reservation.status !== "pending"
    ) {
      throw new Error("この予約はチェックインできません");
    }

    const isAvailable = await this.checkTableAvailability(
      validatedData.tableId,
      reservation.reservationDate,
      reservation.reservationTime,
      id
    );

    if (!isAvailable) {
      throw new Error("指定されたテーブルは使用できません");
    }

    return this.updateReservation(id, {
      tableId: validatedData.tableId,
      status: "checked_in",
      checkedInAt: new Date().toISOString(),
    });
  }

  async cancelReservation(id: string, reason: string): Promise<Reservation> {
    // Validate input
    const validatedData = cancelReservationSchema.parse({
      cancelReason: reason,
    });

    const reservation = await this.getReservationById(id);
    if (!reservation) {
      throw new Error("予約が見つかりません");
    }

    if (
      reservation.status === "completed" ||
      reservation.status === "cancelled"
    ) {
      throw new Error("この予約はキャンセルできません");
    }

    return this.updateReservation(id, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancelReason: validatedData.cancelReason,
    });
  }

  async completeReservation(id: string): Promise<Reservation> {
    const reservation = await this.getReservationById(id);
    if (!reservation) {
      throw new Error("予約が見つかりません");
    }

    if (reservation.status !== "checked_in") {
      throw new Error("チェックイン済みの予約のみ完了できます");
    }

    return this.updateReservation(id, {
      status: "completed",
    });
  }

  async markAsNoShow(id: string): Promise<Reservation> {
    const reservation = await this.getReservationById(id);
    if (!reservation) {
      throw new Error("予約が見つかりません");
    }

    if (
      reservation.status !== "confirmed" &&
      reservation.status !== "pending"
    ) {
      throw new Error("この予約はノーショーにできません");
    }

    return this.updateReservation(id, {
      status: "no_show",
    });
  }

  // Utility methods
  async checkTableAvailability(
    tableId: string,
    date: string,
    time: string,
    excludeReservationId?: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc(
      "check_table_availability",
      {
        p_table_id: tableId,
        p_reservation_date: date,
        p_reservation_time: time,
        p_exclude_reservation_id: excludeReservationId,
      }
    );

    if (error) {
      throw new Error(`利用可能性の確認に失敗しました: ${error.message}`);
    }

    return data || false;
  }

  async getTodaysReservations(): Promise<ReservationWithDetails[]> {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await this.supabase
        .from("reservations")
        .select(
          `
          *,
          customer:customers(id, name, phone_number),
          table:tables(*),
          assigned_cast:staffs!assigned_cast_id(
            id,
            full_name,
            casts_profile!casts_profile_staff_id_fkey(stage_name)
          )
        `
        )
        .eq("reservation_date", today)
        .order("reservation_time", { ascending: true });

      if (error) {
        throw new Error(`本日の予約取得に失敗しました: ${error.message}`);
      }

      return data.map((item) => this.mapToReservationWithDetails(item));
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getTodaysReservations failed:", error);
      }
      throw error;
    }
  }

  // Helper methods
  async getAvailableTables(date: string, time: string): Promise<Table[]> {
    return this.tableService.getAvailableTables(undefined, date, time);
  }

  private async getCurrentStaffId(): Promise<string | null> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError || !user) {
        if (authError && process.env.NODE_ENV === "development") {
          console.error("Failed to get authenticated user:", authError);
        }
        return null;
      }

      const { data: staff, error } = await this.supabase
        .from("staffs")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to get staff id:", error);
        }
        return null;
      }

      return staff?.id || null;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getCurrentStaffId failed:", error);
      }
      return null;
    }
  }

  private mapToReservation(
    data: Database["public"]["Tables"]["reservations"]["Row"]
  ): Reservation {
    return {
      id: data.id,
      customerId: data.customer_id,
      tableId: data.table_id,
      reservationDate: data.reservation_date,
      reservationTime: data.reservation_time,
      numberOfGuests: data.number_of_guests,
      assignedCastId: data.assigned_cast_id,
      specialRequests: data.special_requests,
      status: data.status,
      checkedInAt: data.checked_in_at,
      cancelledAt: data.cancelled_at,
      cancelReason: data.cancel_reason,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToReservationWithDetails(
    data: Record<string, unknown>
  ): ReservationWithDetails {
    const reservation = this.mapToReservation(
      data as Database["public"]["Tables"]["reservations"]["Row"]
    );
    const customerData = data.customer as {
      id: string;
      name: string;
      phone_number: string | null;
    } | null;
    const tableData = data.table as
      | Database["public"]["Tables"]["tables"]["Row"]
      | null;
    const assignedCastData = data.assigned_cast as {
      id: string;
      casts_profile?: { stage_name: string };
    } | null;

    return {
      ...reservation,
      customer: customerData
        ? {
            id: customerData.id,
            name: customerData.name,
            phoneNumber: customerData.phone_number,
          }
        : undefined,
      table: tableData
        ? {
            id: tableData.id,
            tableName: tableData.table_name,
            capacity: tableData.capacity,
            location: tableData.location,
            isVip: tableData.is_vip,
            isActive: tableData.is_active,
            currentStatus: tableData.current_status,
            currentVisitId: tableData.current_visit_id,
            createdAt: tableData.created_at,
            updatedAt: tableData.updated_at,
          }
        : undefined,
      assignedCast: assignedCastData?.casts_profile
        ? {
            id: assignedCastData.id,
            stageName: assignedCastData.casts_profile.stage_name,
          }
        : undefined,
    };
  }
}

// Export singleton instance
export const reservationService = new ReservationService();
