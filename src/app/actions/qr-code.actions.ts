"use server";

import { QRCodeService } from "@/services/qr-code.service";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";

// Create singleton instance
const qrCodeService = new QRCodeService();

// ========== QR Code Generation Actions ==========

const generateQRCodeSchema = z.object({
  staffId: z.string(),
  expiresIn: z.number().min(1).max(1440).optional(), // 1分〜24時間
  location: z.string().optional(),
});

export const generateQRCode = createSafeAction(
  generateQRCodeSchema,
  async (data) => {
    const qrCode = await qrCodeService.generateQRCode(data);
    return qrCode;
  }
);

const validateQRCodeSchema = z.object({
  qrData: z.string(),
  signature: z.string(),
  location: z.string().optional(),
});

export const validateQRCode = createSafeAction(
  validateQRCodeSchema,
  async (data) => {
    const result = await qrCodeService.validateQRCode(data.qrData);
    return result;
  }
);

// ========== Attendance Actions ==========

const recordAttendanceSchema = z.object({
  qrData: z.string(),
  signature: z.string(),
  action: z.enum(["clock_in", "clock_out", "break_start", "break_end"]),
  location: z.string().optional(),
  deviceInfo: z
    .object({
      userAgent: z.string().optional(),
      ipAddress: z.string().optional(),
    })
    .optional(),
});

export const recordAttendance = createSafeAction(
  recordAttendanceSchema,
  async (data) => {
    const response = await qrCodeService.recordAttendance(data);
    return response;
  }
);

const getAttendanceHistorySchema = z.object({
  staffId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const getAttendanceHistory = createSafeAction(
  getAttendanceHistorySchema,
  async ({ staffId, startDate, endDate, limit }) => {
    const history = await qrCodeService.getQRAttendanceHistory(
      staffId,
      startDate,
      endDate,
      limit
    );
    return history;
  }
);

// getCurrentAttendanceStatus is not implemented in QRCodeService
// const getCurrentAttendanceStatusSchema = z.object({
//   staffId: z.string(),
// });

// export const getCurrentAttendanceStatus = createSafeAction(
//   getCurrentAttendanceStatusSchema,
//   async ({ staffId }) => {
//     const status = await qrCodeService.getCurrentAttendanceStatus(staffId);
//     return status;
//   }
// );

// ========== Statistics and Management Actions ==========

export const getQRCodeStats = createSafeAction(z.object({}), async () => {
  const stats = await qrCodeService.getQRCodeStats();
  return stats;
});

const getStaffQRInfoSchema = z.object({
  staffId: z.string(),
});

export const getStaffQRInfo = createSafeAction(
  getStaffQRInfoSchema,
  async ({ staffId }) => {
    const info = await qrCodeService.getStaffQRInfo(staffId);
    return info;
  }
);

// const deactivateQRCodeSchema = z.object({
//   qrCodeId: z.string(),
// });

// deactivateQRCode is not implemented in QRCodeService
// export const deactivateQRCode = createSafeAction(
//   deactivateQRCodeSchema,
//   async ({ qrCodeId }) => {
//     await qrCodeService.deactivateQRCode(qrCodeId);
//     return null;
//   }
// );

// const deactivateStaffQRCodesSchema = z.object({
//   staffId: z.string(),
// });

// deactivateStaffQRCodes is a private method in QRCodeService
// export const deactivateStaffQRCodes = createSafeAction(
//   deactivateStaffQRCodesSchema,
//   async ({ staffId }) => {
//     await qrCodeService.deactivateStaffQRCodes(staffId);
//     return null;
//   }
// );

// ========== Location and Settings Actions ==========

// getLocationSettings is not implemented in QRCodeService
// export const getLocationSettings = createSafeAction(z.object({}), async () => {
//   const settings = await qrCodeService.getLocationSettings();
//   return settings;
// });

// const updateLocationSettingsSchema = z.object({
//   allowedLocations: z.array(z.string()),
//   enableLocationVerification: z.boolean(),
//   maxDistanceMeters: z.number().min(1).optional(),
// });

// updateLocationSettings is not implemented in QRCodeService
// export const updateLocationSettings = createSafeAction(
//   updateLocationSettingsSchema,
//   async (data) => {
//     const settings = await qrCodeService.updateLocationSettings(data);
//     return settings;
//   }
// );

// ========== Cleanup Actions ==========

// cleanupExpiredQRCodes is not implemented in QRCodeService
// export const cleanupExpiredQRCodes = createSafeAction(
//   z.object({}),
//   async () => {
//     const count = await qrCodeService.cleanupExpiredQRCodes();
//     return { cleanedCount: count };
//   }
// );

// ========== Types for client-side use ==========

export type GenerateQRCodeInput = z.infer<typeof generateQRCodeSchema>;
export type ValidateQRCodeInput = z.infer<typeof validateQRCodeSchema>;
export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;
export type GetAttendanceHistoryInput = z.infer<
  typeof getAttendanceHistorySchema
>;
// export type UpdateLocationSettingsInput = z.infer<
//   typeof updateLocationSettingsSchema
// >;
