"use server";

import { customerService } from "@/services/customer.service";
import { authenticatedAction } from "@/lib/actions";
import { z } from "zod";

const searchCustomersSchema = z.object({
  searchTerm: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  limit: z.number().min(1).max(100).optional().default(50),
});

export const searchCustomers = authenticatedAction(
  searchCustomersSchema,
  async (params: z.infer<typeof searchCustomersSchema>) => {
    const customers = await customerService.searchCustomers(params);
    return { success: true, data: customers };
  }
);
