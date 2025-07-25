import { AttendanceBaseService } from "../base/attendance-base.service";
import { attendanceMapperService } from "../base/attendance-mapper.service";
import { shiftTemplateService } from "../templates/shift-template.service";
import type {
  ShiftRequest,
  CreateShiftRequestData,
  ApproveShiftRequestData,
  ShiftRequestSearchParams,
} from "@/types/attendance.types";

/**
 * シフト申請管理専用サービス
 * 責任: シフト申請の作成、承認、検索
 */
export class ShiftRequestService extends AttendanceBaseService {
  constructor() {
    super();
  }

  /**
   * シフト申請を作成
   */
  async createShiftRequest(
    data: CreateShiftRequestData
  ): Promise<ShiftRequest> {
    const staffId = await this.getCurrentStaffId();

    // 入力データ検証
    if (!this.validateDateString(data.requestedDate)) {
      throw new Error("申請日の形式が正しくありません");
    }

    // 過去日の申請をチェック
    const requestedDate = new Date(data.requestedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate < today) {
      throw new Error("過去の日付には申請できません");
    }

    // テンプレート存在確認
    if (data.shiftTemplateId) {
      const template = await shiftTemplateService.getShiftTemplateById(
        data.shiftTemplateId
      );
      if (!template || !template.isActive) {
        throw new Error(
          "指定されたシフトテンプレートが見つからないか、無効です"
        );
      }
    }

    // 時刻検証（カスタム時刻が指定された場合）
    if (data.startTime && !this.validateTimeString(data.startTime)) {
      throw new Error("開始時刻の形式が正しくありません");
    }
    if (data.endTime && !this.validateTimeString(data.endTime)) {
      throw new Error("終了時刻の形式が正しくありません");
    }
    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      throw new Error("開始時刻は終了時刻より前である必要があります");
    }

    // 重複申請チェック
    const isDuplicate = await this.checkDuplicateRequest(
      staffId!,
      data.requestedDate
    );
    if (isDuplicate) {
      throw new Error("同じ日付に既に申請が存在します");
    }

    const { data: request, error } = await this.supabase
      .from("shift_requests")
      .insert(
        this.toSnakeCase({
          staffId: staffId,
          shiftTemplateId: data.shiftTemplateId,
          requestedDate: data.requestedDate,
          startTime: data.startTime,
          endTime: data.endTime,
          notes: data.notes,
          status: "pending",
        })
      )
      .select(
        `
        *,
        staff:staffs(full_name, role),
        shift_template:shift_templates(name)
      `
      )
      .single();

    if (error) {
      this.handleError(error, "シフト申請の作成に失敗しました");
    }

    return attendanceMapperService.mapToShiftRequest(request);
  }

  /**
   * シフト申請を検索
   */
  async searchShiftRequests(
    params: ShiftRequestSearchParams
  ): Promise<ShiftRequest[]> {
    let query = this.supabase.from("shift_requests").select(`
        *,
        staff:staffs(full_name, role),
        shift_template:shift_templates(name)
      `);

    // フィルタリング
    if (params.staffId) {
      query = query.eq("staff_id", params.staffId);
    }

    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.startDate) {
      query = query.gte("requested_date", params.startDate);
    }

    if (params.endDate) {
      query = query.lte("requested_date", params.endDate);
    }

    if (params.shiftTemplateId) {
      query = query.eq("shift_template_id", params.shiftTemplateId);
    }

    // ソート
    const sortField = params.sortBy || "requested_date";
    const sortOrder = params.sortOrder || "asc";
    query = query.order(this.toSnakeCase(sortField) as string, {
      ascending: sortOrder === "asc",
    });

    // ページネーション
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
      this.handleError(error, "シフト申請の検索に失敗しました");
    }

    return data.map(attendanceMapperService.mapToShiftRequest);
  }

  /**
   * シフト申請を承認
   */
  async approveShiftRequest(
    id: string,
    data: ApproveShiftRequestData
  ): Promise<ShiftRequest> {
    const staffId = await this.getCurrentStaffId();

    // 管理者権限チェック
    const isManager = await this.isManagerOrAdmin();
    if (!isManager) {
      throw new Error("シフト申請の承認権限がありません");
    }

    // 申請の存在確認
    const { data: existingRequest, error: fetchError } = await this.supabase
      .from("shift_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingRequest) {
      throw new Error("指定されたシフト申請が見つかりません");
    }

    if (existingRequest.status !== "pending") {
      throw new Error("承認待ち以外の申請は処理できません");
    }

    // スケジュール重複チェック（承認の場合）
    if (data.approved) {
      const hasConflict = await this.checkScheduleConflict(
        existingRequest.staff_id,
        existingRequest.requested_date,
        existingRequest.start_time || "",
        existingRequest.end_time || ""
      );

      if (hasConflict) {
        throw new Error("他のシフトと時間が重複しています");
      }
    }

    const updateData = this.toSnakeCase({
      status: data.approved ? "approved" : "rejected",
      approvedBy: staffId,
      approvedAt: new Date().toISOString(),
      rejectionReason: data.approved ? null : data.rejectionReason,
      notes: data.notes || existingRequest.notes,
    });

    const { data: request, error } = await this.supabase
      .from("shift_requests")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        staff:staffs(full_name, role),
        shift_template:shift_templates(name)
      `
      )
      .single();

    if (error) {
      this.handleError(error, "シフト申請の承認処理に失敗しました");
    }

    return attendanceMapperService.mapToShiftRequest(request);
  }

  /**
   * 申請をキャンセル（申請者のみ）
   */
  async cancelShiftRequest(id: string): Promise<void> {
    const staffId = await this.getCurrentStaffId();

    const { data: request, error: fetchError } = await this.supabase
      .from("shift_requests")
      .select("staff_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !request) {
      throw new Error("指定されたシフト申請が見つかりません");
    }

    // 申請者本人または管理者のみキャンセル可能
    const isManager = await this.isManagerOrAdmin();
    if (request.staff_id !== staffId && !isManager) {
      throw new Error("この申請をキャンセルする権限がありません");
    }

    if (request.status !== "pending") {
      throw new Error("承認待ち以外の申請はキャンセルできません");
    }

    const { error } = await this.supabase
      .from("shift_requests")
      .delete()
      .eq("id", id);

    if (error) {
      this.handleError(error, "シフト申請のキャンセルに失敗しました");
    }
  }

  /**
   * スタッフの申請統計を取得
   */
  async getStaffRequestStats(
    staffId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
  }> {
    let query = this.supabase
      .from("shift_requests")
      .select("status")
      .eq("staff_id", staffId);

    if (startDate) {
      query = query.gte("requested_date", startDate);
    }
    if (endDate) {
      query = query.lte("requested_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      this.handleError(error, "申請統計の取得に失敗しました");
    }

    const requests = data || [];
    return {
      totalRequests: requests.length,
      pendingRequests: requests.filter((r) => r.status === "pending").length,
      approvedRequests: requests.filter((r) => r.status === "approved").length,
      rejectedRequests: requests.filter((r) => r.status === "rejected").length,
    };
  }

  /**
   * 重複申請チェック
   */
  private async checkDuplicateRequest(
    staffId: string,
    requestedDate: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("shift_requests")
      .select("id")
      .eq("staff_id", staffId)
      .eq("requested_date", requestedDate)
      .in("status", ["pending", "approved"])
      .limit(1);

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("重複申請チェックエラー:", error);
      }
      return false;
    }

    return data && data.length > 0;
  }

  /**
   * スケジュール重複チェック
   */
  private async checkScheduleConflict(
    staffId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("confirmed_shifts")
      .select("start_time, end_time")
      .eq("staff_id", staffId)
      .eq("date", date)
      .eq("status", "scheduled");

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("スケジュール重複チェックエラー:", error);
      }
      return false;
    }

    // 時間の重複をチェック
    for (const shift of data || []) {
      if (
        this.isTimeRangeOverlapping(
          startTime,
          endTime,
          shift.start_time,
          shift.end_time
        )
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * 時間範囲の重複チェック
   */
  private isTimeRangeOverlapping(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    return start1 < end2 && start2 < end1;
  }
}

export const shiftRequestService = new ShiftRequestService();
