export type UserRole = "admin" | "manager" | "hall" | "cashier" | "cast";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  staffId?: string;
}

export interface AuthResult {
  success: boolean;
  user?: unknown;
  error?: string;
}

export interface Permission {
  resource: string;
  actions: string[];
}
