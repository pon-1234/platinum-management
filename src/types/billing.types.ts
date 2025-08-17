// Product types
export interface Product {
  id: number;
  name: string;
  // Optional searchable fields if present in DB
  nameKana?: string;
  shortName?: string;
  alias?: string;
  sku?: string;
  code?: string;
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
  customerId?: string;
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
  customerId?: string;
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
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  isSharedItem: boolean;
  targetGuestId: string | null;
}

export interface CreateOrderItemData {
  visitId: string;
  productId: number;
  quantity: number;
  unitPrice?: number; // If not provided, will use product price
  notes?: string;
}

export interface UpdateOrderItemData {
  quantity?: number;
  unitPrice?: number;
  notes?: string;
}

export interface OrderItemSearchParams {
  visitId?: string;
  productId?: number;
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
  casts?: Array<{
    castId: string;
    name?: string;
    role?: string;
    nomination?: string;
    fee?: number;
  }>;
}

export interface OrderItemWithDetails extends OrderItem {
  product?: Product;
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

// --- Pricing Engine Types (Appended on 2025-08-17) ---
export type SeatPlan = "BAR" | "COUNTER" | "VIP_A" | "VIP_B";

export interface PricingRequest {
  plan: SeatPlan;
  startAt: Date | string;
  endAt: Date | string;
  useRoom?: boolean;
  nominationCount?: number;
  inhouseCount?: number;
  applyHouseFee?: boolean;
  applySingleCharge?: boolean;
  /** ドリンク合計（自由入力。最低1,000円〜のため、実際の合計を渡す） */
  drinkTotal?: number;
  /** サービス料＋税率（既定 0.2 = 20%） */
  serviceTaxRate?: number;
  /** サービス料率（例: 0.1 = 10%） */
  serviceRate?: number;
  /** 消費税率（例: 0.1 = 10%） */
  taxRate?: number;
}

export interface PriceLine {
  code: string; // e.g., SET_BAR, EXT_VIP_A, DRINKS
  label: string; // 人間可読
  unitPrice: number; // 円
  quantity: number;
  amount: number; // unitPrice * quantity
  meta?: Record<string, unknown>;
}

export interface PriceQuote {
  plan: SeatPlan;
  startAt: string; // ISO
  endAt: string; // ISO
  stayMinutes: number;
  lines: PriceLine[];
  subtotal: number;
  /** 後方互換用: サービス料＋税の合算 */
  serviceTax: number;
  /** サービス料の内訳 */
  serviceAmount: number;
  /** 税額の内訳 */
  taxAmount: number;
  total: number;
  notes?: string[];
}
