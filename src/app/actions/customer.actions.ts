"use server";

import { customerService } from "@/services/customer.service";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";

const searchCustomersSchema = z.object({
  query: z.string().optional(),
  status: z.enum(["normal", "vip", "caution", "blacklisted"]).optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().optional().default(0),
});

export const searchCustomers = createSafeAction(
  searchCustomersSchema,
  async (params) => {
    const customers = await customerService.searchCustomers(params);
    return customers;
  }
);
