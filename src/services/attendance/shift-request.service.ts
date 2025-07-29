import { BaseService } from "../base.service";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ShiftRequest,
  CreateShiftRequestData,
  ApproveShiftRequestData,
  ShiftRequestSearchParams,
} from "@/types/attendance.types";
import type { Database } from "@/types/database.types";

export class ShiftRequestService extends BaseService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    super();
    this.supabase = createClient();
  }

  async create(data: CreateShiftRequestData): Promise<ShiftRequest> {
    try {
      const { data: request, error } = await this.supabase
        .from("shift_requests")
        .insert(
          this.toSnakeCase({
            staffId: await this.getCurrentStaffId(this.supabase),
            requestedDate: data.requestedDate,
            startTime: data.startTime,
            endTime: data.endTime,
            notes: data.notes || null,
          })
        )
        .select()
        .single();

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "シフト申請の作成に失敗しました")
        );
      }

      return this.mapToShiftRequest(request);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("createShiftRequest failed:", error);
      }
      throw error;
    }
  }

  async search(params: ShiftRequestSearchParams = {}): Promise<ShiftRequest[]> {
    try {
      let query = this.supabase
        .from("shift_requests")
        .select("*")
        .order("request_date", { ascending: false });

      if (params.staffId) {
        query = query.eq("staff_id", params.staffId);
      }

      if (params.status) {
        query = query.eq("status", params.status);
      }

      if (params.startDate) {
        query = query.gte("request_date", params.startDate);
      }

      if (params.endDate) {
        query = query.lte("request_date", params.endDate);
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      if (params.offset) {
        query = query.range(
          params.offset,
          params.offset + (params.limit || 50) - 1
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "シフト申請の検索に失敗しました")
        );
      }

      return data.map(this.mapToShiftRequest);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("searchShiftRequests failed:", error);
      }
      throw error;
    }
  }

  async approve(
    id: string,
    data: ApproveShiftRequestData
  ): Promise<ShiftRequest> {
    try {
      const staffId = await this.getCurrentStaffId(this.supabase);

      const updateData: Record<string, unknown> = {
        status: data.approved ? "approved" : "rejected",
        approved_by: staffId,
        approved_at: new Date().toISOString(),
      };

      if (data.rejectionReason) {
        updateData.rejection_reason = data.rejectionReason;
      }

      const { data: request, error } = await this.supabase
        .from("shift_requests")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "シフト申請の承認処理に失敗しました")
        );
      }

      return this.mapToShiftRequest(request);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("approveShiftRequest failed:", error);
      }
      throw error;
    }
  }

  async delete(requestId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("shift_requests")
        .delete()
        .eq("id", requestId);

      if (error) {
        throw new Error(
          this.handleDatabaseError(
            error,
            "シフトリクエストの削除に失敗しました"
          )
        );
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to delete shift request:", error);
      }
      throw error;
    }
  }

  async getPendingCount(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from("shift_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "件数の取得に失敗しました")
        );
      }

      return data?.length || 0;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getPendingCount failed:", error);
      }
      return 0;
    }
  }

  private mapToShiftRequest(
    data: Database["public"]["Tables"]["shift_requests"]["Row"]
  ): ShiftRequest {
    return this.toCamelCase({
      id: data.id,
      staffId: data.cast_id,
      shiftTemplateId: null,
      requestedDate: data.request_date,
      startTime: data.start_time,
      endTime: data.end_time,
      status: data.status as "pending" | "approved" | "rejected",
      notes: data.notes,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      rejectionReason: data.rejection_reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }) as ShiftRequest;
  }
}

export const shiftRequestService = new ShiftRequestService();
