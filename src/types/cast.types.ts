// Cast types
export type Cast = {
  id: string;
  staffId: string;
  stageName: string;
  birthday: string | null;
  bloodType: string | null;
  height: number | null;
  threeSize: string | null;
  hobby: string | null;
  specialSkill: string | null;
  selfIntroduction: string | null;
  profileImageUrl: string | null;
  hourlyRate: number;
  backPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CastPerformance = {
  id: string;
  castId: string;
  date: string;
  shimeiCount: number;
  dohanCount: number;
  salesAmount: number;
  drinkCount: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

// Input types for creating/updating
export type CreateCastData = {
  staffId: string;
  stageName: string;
  birthday?: string | null;
  bloodType?: string | null;
  height?: number | null;
  threeSize?: string | null;
  hobby?: string | null;
  specialSkill?: string | null;
  selfIntroduction?: string | null;
  profileImageUrl?: string | null;
  hourlyRate: number;
  backPercentage: number;
  isActive?: boolean;
};

export type UpdateCastData = Partial<Omit<CreateCastData, "staffId">>;

export type UpdateCastProfileData = {
  stageName?: string;
  birthday?: string | null;
  bloodType?: string | null;
  height?: number | null;
  threeSize?: string | null;
  hobby?: string | null;
  specialSkill?: string | null;
  selfIntroduction?: string | null;
  profileImageUrl?: string | null;
};

export type CreateCastPerformanceData = {
  castId: string;
  date: string;
  shimeiCount?: number;
  dohanCount?: number;
  salesAmount?: number;
  drinkCount?: number;
};

export type UpdateCastPerformanceData = Partial<
  Omit<CreateCastPerformanceData, "castId">
>;

// Search and filter types
export type CastSearchParams = {
  query?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
};

export type CastPerformancePeriod = "daily" | "weekly" | "monthly";

export type CastPerformanceSearchParams = {
  castId?: string;
  startDate?: string;
  endDate?: string;
  period?: CastPerformancePeriod;
  limit?: number;
  offset?: number;
};

export type CastRanking = {
  cast: Cast;
  totalShimei: number;
  totalDohan: number;
  totalSales: number;
  totalDrinks: number;
  rank: number;
};

// Compensation calculation types
export type CastCompensation = {
  castId: string;
  cast: Cast;
  period: string;
  hourlyWage: number;
  backAmount: number;
  totalAmount: number;
  workHours: number;
  performances: CastPerformance[];
};
