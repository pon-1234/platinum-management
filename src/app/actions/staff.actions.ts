"use server";

import { createStaffService } from "@/services/staff.service";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";

export const getAvailableStaffForCast = createSafeAction(
  z.object({}),
  async (_, { supabase }) => {
    const service = createStaffService(supabase);
    const availableStaff = await service.getAvailableStaffForCast();

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
  async ({ page, limit, searchQuery }, { supabase }) => {
    const service = createStaffService(supabase);
    return service.getUnregisteredStaff(page, limit, searchQuery);
  }
);
