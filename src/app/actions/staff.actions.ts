"use server";

import { staffService } from "@/services/staff.service";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";

export const getAvailableStaffForCast = createSafeAction(
  z.object({}),
  async () => {
    const availableStaff = await staffService.getAvailableStaffForCast();

    return availableStaff.map((staff) => ({
      id: staff.id,
      fullName: staff.fullName,
      fullNameKana: staff.fullNameKana,
      role: staff.role,
      status: staff.status,
    }));
  }
);

const getUnregisteredStaffSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  searchQuery: z.string().optional(),
});

export const getUnregisteredStaff = createSafeAction(
  getUnregisteredStaffSchema,
  async ({ page, limit, searchQuery }) => {
    return staffService.getUnregisteredStaff(page, limit, searchQuery);
  }
);
