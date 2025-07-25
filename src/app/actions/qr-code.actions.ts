"use server";

import { QRCodeService } from "@/services/qr-code.service";
import { authenticatedAction } from "@/lib/actions";
import { z } from "zod";

// Create singleton instance
const qrCodeService = new QRCodeService();

// ========== QR Code Generation Actions ==========

const generateQRCodeSchema = z.object({
  staffId: z.string(),
  expiresIn: z.number().min(1).max(1440).optional(), // 1分〜24時間
  location: z.string().optional(),
});

export const generateQRCode = authenticatedAction(
  generateQRCodeSchema,
  async (data: z.infer<typeof generateQRCodeSchema>) => {
    const qrCode = await qrCodeService.generateQRCode(data);
    return { success: true, data: qrCode };
  }
);

const validateQRCodeSchema = z.object({
  qrData: z.string(),
  signature: z.string(),
  location: z.string().optional(),
});

export const validateQRCode = authenticatedAction(
  validateQRCodeSchema,
  async (data: z.infer<typeof validateQRCodeSchema>) => {
    const result = await qrCodeService.validateQRCode(
      data.qrData,
      data.signature,
      data.location
    );
    return { success: true, data: result };
  }
);

// ========== Attendance Actions ==========

const recordAttendanceSchema = z.object({
  qrData: z.string(),
  signature: z.string(),
  action: z.enum(["check_in", "check_out"]),
  location: z.string().optional(),
  deviceInfo: z
    .object({
      userAgent: z.string().optional(),
      ipAddress: z.string().optional(),
    })
    .optional(),
});

export const recordAttendance = authenticatedAction(
  recordAttendanceSchema,
  async (data: z.infer<typeof recordAttendanceSchema>) => {
    const response = await qrCodeService.recordAttendance(data);
    return { success: true, data: response };
  }
);

const getAttendanceHistorySchema = z.object({
  staffId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const getAttendanceHistory = authenticatedAction(
  getAttendanceHistorySchema,
  async (filter: z.infer<typeof getAttendanceHistorySchema>) => {
    const history = await qrCodeService.getAttendanceHistory(filter);
    return { success: true, data: history };
  }
);

const getCurrentAttendanceStatusSchema = z.object({
  staffId: z.string(),
});

export const getCurrentAttendanceStatus = authenticatedAction(
  getCurrentAttendanceStatusSchema,
  async ({ staffId }) => {
    const status = await qrCodeService.getCurrentAttendanceStatus(staffId);
    return { success: true, data: status };
  }
);

// ========== Statistics and Management Actions ==========

export const getQRCodeStats = authenticatedAction(z.object({}), async () => {
  const stats = await qrCodeService.getQRCodeStats();
  return { success: true, data: stats };
});

const getStaffQRInfoSchema = z.object({
  staffId: z.string(),
});

export const getStaffQRInfo = authenticatedAction(
  getStaffQRInfoSchema,
  async ({ staffId }) => {
    const info = await qrCodeService.getStaffQRInfo(staffId);
    return { success: true, data: info };
  }
);

const deactivateQRCodeSchema = z.object({
  qrCodeId: z.string(),
});

export const deactivateQRCode = authenticatedAction(
  deactivateQRCodeSchema,
  async ({ qrCodeId }) => {
    await qrCodeService.deactivateQRCode(qrCodeId);
    return { success: true };
  }
);

const deactivateStaffQRCodesSchema = z.object({
  staffId: z.string(),
});

export const deactivateStaffQRCodes = authenticatedAction(
  deactivateStaffQRCodesSchema,
  async ({ staffId }) => {
    await qrCodeService.deactivateStaffQRCodes(staffId);
    return { success: true };
  }
);

// ========== Location and Settings Actions ==========

export const getLocationSettings = authenticatedAction(
  z.object({}),
  async () => {
    const settings = await qrCodeService.getLocationSettings();
    return { success: true, data: settings };
  }
);

const updateLocationSettingsSchema = z.object({
  allowedLocations: z.array(z.string()),
  enableLocationVerification: z.boolean(),
  maxDistanceMeters: z.number().min(1).optional(),
});

export const updateLocationSettings = authenticatedAction(
  updateLocationSettingsSchema,
  async (data: z.infer<typeof updateLocationSettingsSchema>) => {
    const settings = await qrCodeService.updateLocationSettings(data);
    return { success: true, data: settings };
  }
);

// ========== Cleanup Actions ==========

export const cleanupExpiredQRCodes = authenticatedAction(
  z.object({}),
  async () => {
    const count = await qrCodeService.cleanupExpiredQRCodes();
    return { success: true, data: { cleanedCount: count } };
  }
);

// ========== Types for client-side use ==========

export type GenerateQRCodeInput = z.infer<typeof generateQRCodeSchema>;
export type ValidateQRCodeInput = z.infer<typeof validateQRCodeSchema>;
export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;
export type GetAttendanceHistoryInput = z.infer<
  typeof getAttendanceHistorySchema
>;
export type UpdateLocationSettingsInput = z.infer<
  typeof updateLocationSettingsSchema
>;
