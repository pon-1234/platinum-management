// キャスト指名関連の型定義

export interface NominationType {
  id: string;
  type_name: string;
  display_name: string;
  price: number;
  back_rate: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisitCastAssignment {
  id: string;
  visit_id: string;
  cast_id: string;
  nomination_type_id: string;
  assigned_at: string;
  ended_at?: string | null;
  is_primary: boolean;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  cast?: {
    id: string;
    name: string;
    staff_code?: string;
  };
  nomination_type?: NominationType;
}

export interface CreateAssignmentInput {
  visit_id: string;
  cast_id: string;
  nomination_type_id: string;
  is_primary?: boolean;
  notes?: string;
}

export interface UpdateAssignmentInput {
  ended_at?: string;
  is_primary?: boolean;
  notes?: string;
}

export interface CreateNominationTypeInput {
  type_name: string;
  display_name: string;
  price: number;
  back_rate: number;
  priority?: number;
  is_active?: boolean;
}

export interface UpdateNominationTypeInput {
  display_name?: string;
  price?: number;
  back_rate?: number;
  priority?: number;
  is_active?: boolean;
}

export interface NominationFeeCalculation {
  total: number;
  details: Array<{
    cast_id: string;
    cast_name: string;
    nomination_type: string;
    fee: number;
  }>;
}
