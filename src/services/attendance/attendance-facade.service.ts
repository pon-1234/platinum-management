import { BaseService } from "../base.service";
import { shiftRequestService } from "./shift-request.service";
import { shiftScheduleService } from "./shift-schedule.service";
import { attendanceTrackingService } from "./attendance-tracking.service";
import { attendanceReportingService } from "./attendance-reporting.service";

import type {
  ShiftTemplate,
  ShiftRequest,
  ConfirmedShift,
  AttendanceRecord,
  CreateShiftTemplateData,
  UpdateShiftTemplateData,
  CreateShiftRequestData,
  ApproveShiftRequestData,
  ShiftRequestSearchParams,
  CreateConfirmedShiftData,
  ConfirmedShiftSearchParams,
  CreateAttendanceRecordData,
  AttendanceSearchParams,
  ClockAction,
  AttendanceDashboard,
  MonthlyAttendanceSummary,
  WeeklySchedule,
} from "@/types/attendance.types";

export class AttendanceFacadeService extends BaseService {
  constructor() {
    super();
  }

  // ============= SHIFT TEMPLATE MANAGEMENT =============

  async createShiftTemplate(
    data: CreateShiftTemplateData
  ): Promise<ShiftTemplate> {
    return shiftScheduleService.createTemplate(data);
  }

  async getShiftTemplateById(id: string): Promise<ShiftTemplate | null> {
    return shiftScheduleService.getTemplateById(id);
  }

  async getAllShiftTemplates(): Promise<ShiftTemplate[]> {
    return shiftScheduleService.getAllTemplates();
  }

  async updateShiftTemplate(
    id: string,
    data: UpdateShiftTemplateData
  ): Promise<ShiftTemplate> {
    return shiftScheduleService.updateTemplate(id, data);
  }

  async deleteShiftTemplate(id: string): Promise<void> {
    return shiftScheduleService.deleteTemplate(id);
  }

  // ============= SHIFT REQUEST MANAGEMENT =============

  async createShiftRequest(
    data: CreateShiftRequestData
  ): Promise<ShiftRequest> {
    return shiftRequestService.create(data);
  }

  async searchShiftRequests(
    params: ShiftRequestSearchParams = {}
  ): Promise<ShiftRequest[]> {
    return shiftRequestService.search(params);
  }

  async approveShiftRequest(
    id: string,
    data: ApproveShiftRequestData
  ): Promise<ShiftRequest> {
    return shiftRequestService.approve(id, data);
  }

  async deleteShiftRequest(requestId: string): Promise<void> {
    return shiftRequestService.delete(requestId);
  }

  // ============= CONFIRMED SHIFT MANAGEMENT =============

  async createConfirmedShift(
    data: CreateConfirmedShiftData
  ): Promise<ConfirmedShift> {
    return shiftScheduleService.createConfirmedShift(data);
  }

  async searchConfirmedShifts(
    params: ConfirmedShiftSearchParams = {}
  ): Promise<ConfirmedShift[]> {
    return shiftScheduleService.searchConfirmedShifts(params);
  }

  async deleteConfirmedShift(shiftId: string): Promise<void> {
    return shiftScheduleService.deleteConfirmedShift(shiftId);
  }

  async getWeeklySchedule(weekStart: string): Promise<WeeklySchedule> {
    return shiftScheduleService.getWeeklySchedule(weekStart);
  }

  // ============= ATTENDANCE RECORD MANAGEMENT =============

  async createAttendanceRecord(
    data: CreateAttendanceRecordData
  ): Promise<AttendanceRecord> {
    return attendanceTrackingService.createRecord(data);
  }

  async searchAttendanceRecords(
    params: AttendanceSearchParams = {}
  ): Promise<AttendanceRecord[]> {
    return attendanceTrackingService.search(params);
  }

  async clockAction(
    staffId: string,
    action: ClockAction
  ): Promise<AttendanceRecord> {
    return attendanceTrackingService.clockAction(staffId, action);
  }

  // ============= DASHBOARD AND REPORTS =============

  async getAttendanceDashboard(): Promise<AttendanceDashboard> {
    return attendanceReportingService.getDashboard();
  }

  async getMonthlyAttendanceSummary(
    staffId: string,
    month: string
  ): Promise<MonthlyAttendanceSummary> {
    return attendanceReportingService.getMonthlyAttendanceSummary(
      staffId,
      month
    );
  }
}

export const attendanceFacadeService = new AttendanceFacadeService();
