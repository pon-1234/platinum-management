export type CustomerStatus = "normal" | "vip" | "caution" | "blacklisted";
export type VisitStatus = "active" | "completed" | "cancelled";

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

export interface CreateCustomerData {
  name: string;
  nameKana?: string;
  phoneNumber?: string;
  lineId?: string;
  birthday?: string;
  memo?: string;
  status?: CustomerStatus;
}

export interface UpdateCustomerData {
  name?: string;
  nameKana?: string;
  phoneNumber?: string;
  lineId?: string;
  birthday?: string;
  memo?: string;
  status?: CustomerStatus;
}

export interface CreateVisitData {
  customerId: string;
  tableId: number;
  numGuests?: number;
  checkInAt?: string;
}

export interface UpdateVisitData {
  tableId?: number;
  checkOutAt?: string;
  numGuests?: number;
  totalAmount?: number;
  status?: VisitStatus;
}

export interface CustomerSearchParams {
  query?: string;
  status?: CustomerStatus;
  limit?: number;
  offset?: number;
}
