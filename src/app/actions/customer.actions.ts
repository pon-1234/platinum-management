"use server";

import { customerService } from "@/services/customer.service";
import { createSafeAction } from "@/lib/safe-action";
import { z } from "zod";

const searchCustomersSchema = z.object({
  searchTerm: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  limit: z.number().min(1).max(100).optional().default(50),
});

export const searchCustomers = createSafeAction(
  searchCustomersSchema,
  async (params) => {
    const customers = await customerService.searchCustomers(params);
    return customers;
  }
);
