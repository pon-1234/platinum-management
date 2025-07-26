import { z } from "zod";
import {
  customerStatusSchema,
  visitStatusSchema,
  createCustomerSchema,
  updateCustomerSchema,
  createVisitSchema,
  updateVisitSchema,
  customerSearchSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type CustomerSearchInput,
  type CreateVisitInput,
  type UpdateVisitInput,
  type CustomerStatus,
  type VisitStatus,
} from "@/lib/validations/customer";

// Re-export types from Zod schemas
export type { CustomerStatus, VisitStatus };
export type { CreateCustomerInput, UpdateCustomerInput, CustomerSearchInput };
export type { CreateVisitInput, UpdateVisitInput };

// Base types that include database fields (id, createdAt, etc.)
export interface Customer {
  id: string;
  name: string;
  nameKana: string | null;
  phoneNumber: string | null;
  lineId: string | null;
  birthday: string | null;
  memo: string | null;
  status: CustomerStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Visit {
  id: string;
  customerId: string;
  tableId: number;
  checkInAt: string;
  checkOutAt: string | null;
  numGuests: number;
  totalAmount: number | null;
  status: VisitStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Legacy aliases for backward compatibility
export type CreateCustomerData = CreateCustomerInput;
export type UpdateCustomerData = UpdateCustomerInput;
export type CreateVisitData = CreateVisitInput;
export type UpdateVisitData = UpdateVisitInput;
export type CustomerSearchParams = CustomerSearchInput;

// Export schemas for runtime validation
export {
  customerStatusSchema,
  visitStatusSchema,
  createCustomerSchema,
  updateCustomerSchema,
  createVisitSchema,
  updateVisitSchema,
  customerSearchSchema,
};
