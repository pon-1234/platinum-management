import { z } from "zod";

// Table status validation
export const tableStatusEnum = z.enum([
  "available",
  "reserved",
  "occupied",
  "cleaning",
]);

export const tableStatusUpdateSchema = z.object({
  status: tableStatusEnum,
});

export type TableStatusUpdateData = z.infer<typeof tableStatusUpdateSchema>;
