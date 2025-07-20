// Product types
export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  cost: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  name: string;
  category: string;
  price: number;
  cost?: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
}

export interface UpdateProductData {
  name?: string;
  category?: string;
  price?: number;
  cost?: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
}

export interface ProductSearchParams {
  query?: string;
  category?: string;
  isActive?: boolean;
  lowStock?: boolean;
  limit?: number;
  offset?: number;
}

// Visit types
export interface Visit {
  id: string;
  customerId: string;
  tableId: number;
  checkInAt: string;
  checkOutAt: string | null;
  numGuests: number;
  subtotal: number | null;
  serviceCharge: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  paymentMethod: string | null;
  paymentStatus: PaymentStatus;
  status: VisitStatus;
  notes: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VisitStatus = "active" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "card" | "mixed";

export interface CreateVisitData {
  customerId: string;
  tableId: number;
  numGuests: number;
  checkInAt?: string;
  notes?: string;
}

export interface UpdateVisitData {
  tableId?: number;
  numGuests?: number;
  checkOutAt?: string;
  subtotal?: number;
  serviceCharge?: number;
  taxAmount?: number;
  totalAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  status?: VisitStatus;
  notes?: string;
}

export interface VisitSearchParams {
  customerId?: string;
  tableId?: number;
  status?: VisitStatus;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Order Item types
export interface OrderItem {
  id: number;
  visitId: string;
  productId: number;
  castId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateOrderItemData {
  visitId: string;
  productId: number;
  castId?: string;
  quantity: number;
  unitPrice?: number; // If not provided, will use product price
  notes?: string;
}

export interface UpdateOrderItemData {
  quantity?: number;
  unitPrice?: number;
  castId?: string;
  notes?: string;
}

export interface OrderItemSearchParams {
  visitId?: string;
  productId?: number;
  castId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Billing calculation types
export interface BillCalculation {
  subtotal: number;
  serviceCharge: number;
  taxAmount: number;
  totalAmount: number;
}

export interface PaymentData {
  method: PaymentMethod;
  amount: number;
  cashReceived?: number;
  changeAmount?: number;
  notes?: string;
}

// Related types with details
export interface VisitWithDetails extends Visit {
  customer?: {
    id: string;
    name: string;
    phoneNumber: string | null;
  };
  orderItems?: OrderItemWithDetails[];
}

export interface OrderItemWithDetails extends OrderItem {
  product?: Product;
  cast?: {
    id: string;
    fullName: string;
  };
}

// Daily report types
export interface DailyReport {
  date: string;
  totalVisits: number;
  totalSales: number;
  totalCash: number;
  totalCard: number;
  topProducts: Array<{
    productId: number;
    productName: string;
    quantity: number;
    totalAmount: number;
  }>;
  topCasts: Array<{
    castId: string;
    castName: string;
    orderCount: number;
    totalAmount: number;
  }>;
}

// Product categories (can be extended)
export const PRODUCT_CATEGORIES = [
  "alcoholic_beverages",
  "non_alcoholic_beverages",
  "food",
  "tobacco",
  "other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
