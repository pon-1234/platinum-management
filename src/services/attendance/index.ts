/**
 * 出勤管理サービスのエントリーポイント
 *
 * 各サービスの役割:
 * - AttendanceBaseService: 共通ベース機能
 * - AttendanceMapperService: データマッピング
 * - ShiftTemplateService: シフトテンプレート管理
 * - ShiftRequestService: シフト申請管理
 * - ShiftScheduleService: 確定シフト・スケジュール管理
 * - AttendanceTrackingService: 出勤記録・打刻管理
 * - AttendanceReportingService: ダッシュボード・レポート
 */

// Base services
export { AttendanceBaseService } from "./base/attendance-base.service";
export {
  AttendanceMapperService,
  attendanceMapperService,
} from "./base/attendance-mapper.service";

// Feature services
export {
  ShiftTemplateService,
  shiftTemplateService,
} from "./templates/shift-template.service";
export {
  ShiftRequestService,
  shiftRequestService,
} from "./requests/shift-request.service";

// TODO: Export remaining services when implemented
// export { ShiftScheduleService, shiftScheduleService } from "./scheduling/shift-schedule.service";
// export { AttendanceTrackingService, attendanceTrackingService } from "./tracking/attendance-tracking.service";
// export { AttendanceReportingService, attendanceReportingService } from "./reporting/attendance-reporting.service";

/**
 * 統合AttendanceServiceクラス - 後方互換性のため
 * 既存のコードが動作するよう、従来のインターフェースを提供
 */
export class AttendanceService {
  private templateService = shiftTemplateService;
  private requestService = shiftRequestService;
  // TODO: Add other services when implemented
  // private scheduleService = shiftScheduleService;
  // private trackingService = attendanceTrackingService;
  // private reportingService = attendanceReportingService;

  // Shift Template methods
  async createShiftTemplate(
    data: import("@/types/attendance.types").CreateShiftTemplateData
  ) {
    return this.templateService.createShiftTemplate(data);
  }

  async getShiftTemplateById(id: string) {
    return this.templateService.getShiftTemplateById(id);
  }

  async getAllShiftTemplates() {
    return this.templateService.getAllShiftTemplates();
  }

  async updateShiftTemplate(
    id: string,
    data: import("@/types/attendance.types").UpdateShiftTemplateData
  ) {
    return this.templateService.updateShiftTemplate(id, data);
  }

  async deleteShiftTemplate(id: string) {
    return this.templateService.deleteShiftTemplate(id);
  }

  // Shift Request methods
  async createShiftRequest(
    data: import("@/types/attendance.types").CreateShiftRequestData
  ) {
    return this.requestService.createShiftRequest(data);
  }

  async searchShiftRequests(
    params: import("@/types/attendance.types").ShiftRequestSearchParams
  ) {
    return this.requestService.searchShiftRequests(params);
  }

  async approveShiftRequest(
    id: string,
    data: import("@/types/attendance.types").ApproveShiftRequestData
  ) {
    return this.requestService.approveShiftRequest(id, data);
  }

  // TODO: Add other methods when services are implemented
  /*
  async createConfirmedShift(data: import("@/types/attendance.types").CreateConfirmedShiftData) {
    return this.scheduleService.createConfirmedShift(data);
  }

  async searchConfirmedShifts(params: import("@/types/attendance.types").ConfirmedShiftSearchParams) {
    return this.scheduleService.searchConfirmedShifts(params);
  }

  async createAttendanceRecord(data: import("@/types/attendance.types").CreateAttendanceRecordData) {
    return this.trackingService.createAttendanceRecord(data);
  }

  async clockAction(staffId: string, action: import("@/types/attendance.types").ClockAction) {
    return this.trackingService.clockAction(staffId, action);
  }

  async getAttendanceDashboard() {
    return this.reportingService.getAttendanceDashboard();
  }

  async getMonthlyAttendanceSummary(staffId: string, month: string) {
    return this.reportingService.getMonthlyAttendanceSummary(staffId, month);
  }
  */
}

// 既存コード用のシングルトンインスタンス
export const attendanceService = new AttendanceService();
