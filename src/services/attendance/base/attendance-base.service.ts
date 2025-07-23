import { BaseService } from "../../base.service";

/**
 * 出勤管理システム共通ベースサービス
 * 責任: 出勤関連サービス間で共有される共通機能
 */
export abstract class AttendanceBaseService extends BaseService {
  constructor() {
    super();
  }

  /**
   * 日付文字列を検証
   */
  protected validateDateString(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * 時刻文字列を検証 (HH:MM format)
   */
  protected validateTimeString(timeString: string): boolean {
    const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timePattern.test(timeString);
  }

  /**
   * 週の開始日を取得 (月曜日)
   */
  protected getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  /**
   * 週の終了日を取得 (日曜日)
   */
  protected getWeekEnd(date: Date): Date {
    const weekStart = this.getWeekStart(new Date(date));
    return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  }

  /**
   * 月の開始日を取得
   */
  protected getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * 月の終了日を取得
   */
  protected getMonthEnd(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  /**
   * 時間差を分単位で計算
   */
  protected calculateMinutesDifference(
    startTime: string,
    endTime: string
  ): number {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  }

  /**
   * 勤務時間を時間:分形式で取得
   */
  protected formatWorkingHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, "0")}`;
  }

  /**
   * 日付範囲の重複をチェック
   */
  protected isDateRangeOverlapping(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 <= end2 && start2 <= end1;
  }

  /**
   * スタッフIDの存在確認
   */
  protected async validateStaffExists(staffId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("staffs")
      .select("id")
      .eq("id", staffId)
      .eq("is_active", true)
      .single();

    return !error && !!data;
  }

  /**
   * 管理者権限チェック
   */
  protected async isManagerOrAdmin(): Promise<boolean> {
    const staffId = await this.getCurrentStaffId();
    if (!staffId) return false;

    const { data } = await this.supabase
      .from("staffs")
      .select("role")
      .eq("id", staffId)
      .single();

    return data?.role === "manager" || data?.role === "admin";
  }
}
