// Reservation types
export type Reservation = {
  id: string;
  customerId: string;
  tableId: string | null;
  reservationDate: string;
  reservationTime: string;
  numberOfGuests: number;
  assignedCastId: string | null;
  specialRequests: string | null;
  status: ReservationStatus;
  checkedInAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

// Table types
export type Table = {
  id: string;
  tableName: string;
  capacity: number;
  location: string | null;
  isActive: boolean;
  currentStatus: TableStatus;
  currentVisitId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TableStatus = "available" | "reserved" | "occupied" | "cleaning";

// Input types for creating/updating
export type CreateReservationData = {
  customerId: string;
  tableId?: string | null;
  reservationDate: string;
  reservationTime: string;
  numberOfGuests: number;
  assignedCastId?: string | null;
  specialRequests?: string | null;
  status?: ReservationStatus;
};

export type UpdateReservationData = Partial<CreateReservationData> & {
  checkedInAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
};

export type CreateTableData = {
  tableName: string;
  capacity: number;
  location?: string | null;
  isActive?: boolean;
};

export type UpdateTableData = Partial<CreateTableData> & {
  currentStatus?: TableStatus;
  currentVisitId?: string | null;
};

// Search and filter types
export type ReservationSearchParams = {
  customerId?: string;
  tableId?: string;
  assignedCastId?: string;
  startDate?: string;
  endDate?: string;
  status?: ReservationStatus;
  limit?: number;
  offset?: number;
};

export type TableSearchParams = {
  search?: string;
  status?: TableStatus;
  isActive?: boolean;
  minCapacity?: number;
  maxCapacity?: number;
};

// Related types
export type ReservationWithDetails = Reservation & {
  customer?: {
    id: string;
    name: string;
    phoneNumber: string | null;
  };
  table?: Table;
  assignedCast?: {
    id: string;
    stageName: string;
  };
};

export type TableWithCurrentReservation = Table & {
  currentReservation?: Reservation | null;
};
