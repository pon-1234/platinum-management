// Re-export all attendance services
export { attendanceFacadeService } from "./attendance-facade.service";
export { shiftRequestService } from "./shift-request.service";
export { shiftScheduleService } from "./shift-schedule.service";
export { attendanceTrackingService } from "./attendance-tracking.service";
export { attendanceReportingService } from "./attendance-reporting.service";

// For backward compatibility, export the facade as the default attendanceService
export { attendanceFacadeService as attendanceService } from "./attendance-facade.service";
