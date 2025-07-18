export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      staffs: {
        Row: {
          id: string;
          user_id: string | null;
          full_name: string;
          role: "admin" | "manager" | "hall" | "cashier" | "cast";
          hire_date: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          full_name: string;
          role: "admin" | "manager" | "hall" | "cashier" | "cast";
          hire_date?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          full_name?: string;
          role?: "admin" | "manager" | "hall" | "cashier" | "cast";
          hire_date?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      casts_profile: {
        Row: {
          staff_id: string;
          nickname: string;
          profile_image_url: string | null;
          bio: string | null;
          hourly_wage: number;
          commission_rate: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          staff_id: string;
          nickname: string;
          profile_image_url?: string | null;
          bio?: string | null;
          hourly_wage?: number;
          commission_rate?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          staff_id?: string;
          nickname?: string;
          profile_image_url?: string | null;
          bio?: string | null;
          hourly_wage?: number;
          commission_rate?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
