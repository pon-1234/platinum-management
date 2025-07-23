import { AttendanceBaseService } from "../base/attendance-base.service";
import { attendanceMapperService } from "../base/attendance-mapper.service";
import type {
  ShiftTemplate,
  CreateShiftTemplateData,
  UpdateShiftTemplateData,
} from "@/types/attendance.types";

/**
 * シフトテンプレート管理専用サービス
 * 責任: シフトテンプレートのCRUD操作
 */
export class ShiftTemplateService extends AttendanceBaseService {
  constructor() {
    super();
  }

  /**
   * シフトテンプレートを作成
   */
  async createShiftTemplate(
    data: CreateShiftTemplateData
  ): Promise<ShiftTemplate> {
    const staffId = await this.getCurrentStaffId();

    // 入力データ検証
    if (!this.validateTimeString(data.startTime)) {
      throw new Error("開始時刻の形式が正しくありません");
    }
    if (!this.validateTimeString(data.endTime)) {
      throw new Error("終了時刻の形式が正しくありません");
    }
    if (data.startTime >= data.endTime) {
      throw new Error("開始時刻は終了時刻より前である必要があります");
    }

    const { data: template, error } = await this.supabase
      .from("shift_templates")
      .insert(
        this.toSnakeCase({
          name: data.name,
          startTime: data.startTime,
          endTime: data.endTime,
          daysOfWeek: data.daysOfWeek,
          isActive: data.isActive ?? true,
          createdBy: staffId,
          updatedBy: staffId,
        })
      )
      .select()
      .single();

    if (error) {
      this.handleError(error, "シフトテンプレートの作成に失敗しました");
    }

    return attendanceMapperService.mapToShiftTemplate(template);
  }

  /**
   * IDでシフトテンプレートを取得
   */
  async getShiftTemplateById(id: string): Promise<ShiftTemplate | null> {
    const { data, error } = await this.supabase
      .from("shift_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      this.handleError(error, "シフトテンプレートの取得に失敗しました");
    }

    return attendanceMapperService.mapToShiftTemplate(data);
  }

  /**
   * 全シフトテンプレートを取得
   */
  async getAllShiftTemplates(): Promise<ShiftTemplate[]> {
    const { data, error } = await this.supabase
      .from("shift_templates")
      .select("*")
      .order("name");

    if (error) {
      this.handleError(error, "シフトテンプレートの取得に失敗しました");
    }

    return data.map(attendanceMapperService.mapToShiftTemplate);
  }

  /**
   * アクティブなシフトテンプレートのみを取得
   */
  async getActiveShiftTemplates(): Promise<ShiftTemplate[]> {
    const { data, error } = await this.supabase
      .from("shift_templates")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      this.handleError(
        error,
        "アクティブなシフトテンプレートの取得に失敗しました"
      );
    }

    return data.map(attendanceMapperService.mapToShiftTemplate);
  }

  /**
   * 特定の曜日に適用されるテンプレートを取得
   */
  async getTemplatesForDayOfWeek(dayOfWeek: number): Promise<ShiftTemplate[]> {
    const { data, error } = await this.supabase
      .from("shift_templates")
      .select("*")
      .eq("is_active", true)
      .contains("days_of_week", [dayOfWeek])
      .order("start_time");

    if (error) {
      this.handleError(error, "曜日別シフトテンプレートの取得に失敗しました");
    }

    return data.map(attendanceMapperService.mapToShiftTemplate);
  }

  /**
   * シフトテンプレートを更新
   */
  async updateShiftTemplate(
    id: string,
    data: UpdateShiftTemplateData
  ): Promise<ShiftTemplate> {
    const staffId = await this.getCurrentStaffId();

    // 入力データ検証
    if (data.startTime && !this.validateTimeString(data.startTime)) {
      throw new Error("開始時刻の形式が正しくありません");
    }
    if (data.endTime && !this.validateTimeString(data.endTime)) {
      throw new Error("終了時刻の形式が正しくありません");
    }
    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      throw new Error("開始時刻は終了時刻より前である必要があります");
    }

    const updateData = this.toSnakeCase({
      updatedBy: staffId,
      ...data,
    });

    const { data: template, error } = await this.supabase
      .from("shift_templates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.handleError(error, "シフトテンプレートの更新に失敗しました");
    }

    return attendanceMapperService.mapToShiftTemplate(template);
  }

  /**
   * シフトテンプレートを削除（論理削除）
   */
  async deleteShiftTemplate(id: string): Promise<void> {
    const staffId = await this.getCurrentStaffId();

    // 使用中のテンプレートかチェック
    const { data: usageCheck } = await this.supabase
      .from("shift_requests")
      .select("id")
      .eq("shift_template_id", id)
      .eq("status", "approved")
      .limit(1);

    if (usageCheck && usageCheck.length > 0) {
      throw new Error(
        "このテンプレートは承認済みのシフト申請で使用されているため削除できません"
      );
    }

    const { error } = await this.supabase
      .from("shift_templates")
      .update({
        is_active: false,
        updated_by: staffId,
      })
      .eq("id", id);

    if (error) {
      this.handleError(error, "シフトテンプレートの削除に失敗しました");
    }
  }

  /**
   * テンプレート名の重複チェック
   */
  async isTemplateNameUnique(
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = this.supabase
      .from("shift_templates")
      .select("id")
      .eq("name", name)
      .eq("is_active", true);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("テンプレート名重複チェックエラー:", error);
      return false;
    }

    return !data || data.length === 0;
  }

  /**
   * テンプレートの使用状況を取得
   */
  async getTemplateUsageStats(id: string): Promise<{
    totalRequests: number;
    approvedRequests: number;
    pendingRequests: number;
    confirmedShifts: number;
  }> {
    const [requestsResult, confirmedResult] = await Promise.all([
      this.supabase
        .from("shift_requests")
        .select("status")
        .eq("shift_template_id", id),
      this.supabase
        .from("confirmed_shifts")
        .select("id", { count: "exact", head: true })
        .eq("shift_template_id", id),
    ]);

    const requests = requestsResult.data || [];
    const totalRequests = requests.length;
    const approvedRequests = requests.filter(
      (r) => r.status === "approved"
    ).length;
    const pendingRequests = requests.filter(
      (r) => r.status === "pending"
    ).length;
    const confirmedShifts = confirmedResult.count || 0;

    return {
      totalRequests,
      approvedRequests,
      pendingRequests,
      confirmedShifts,
    };
  }
}

export const shiftTemplateService = new ShiftTemplateService();
