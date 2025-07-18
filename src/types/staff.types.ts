import type { UserRole } from "./auth.types";

export interface Staff {
  id: string;
  userId: string | null;
  fullName: string;
  role: UserRole;
  hireDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CastProfile {
  staffId: string;
  nickname: string;
  profileImageUrl: string | null;
  bio: string | null;
  hourlyWage: number;
  commissionRate: {
    shimei: number;
    bottlePercent: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffData {
  userId: string;
  fullName: string;
  role: UserRole;
  hireDate?: string;
}

export interface UpdateStaffData {
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface CreateCastProfileData {
  staffId: string;
  nickname: string;
  profileImageUrl?: string;
  bio?: string;
  hourlyWage?: number;
  commissionRate?: {
    shimei: number;
    bottlePercent: number;
  };
}

export interface UpdateCastProfileData {
  nickname?: string;
  profileImageUrl?: string;
  bio?: string;
  hourlyWage?: number;
  commissionRate?: {
    shimei: number;
    bottlePercent: number;
  };
}
