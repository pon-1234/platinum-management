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
          id: string;
          staff_id: string;
          stage_name: string;
          birthday: string | null;
          blood_type: string | null;
          height: number | null;
          three_size: string | null;
          hobby: string | null;
          special_skill: string | null;
          self_introduction: string | null;
          profile_image_url: string | null;
          hourly_rate: number;
          back_percentage: number;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          stage_name: string;
          birthday?: string | null;
          blood_type?: string | null;
          height?: number | null;
          three_size?: string | null;
          hobby?: string | null;
          special_skill?: string | null;
          self_introduction?: string | null;
          profile_image_url?: string | null;
          hourly_rate?: number;
          back_percentage?: number;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          stage_name?: string;
          birthday?: string | null;
          blood_type?: string | null;
          height?: number | null;
          three_size?: string | null;
          hobby?: string | null;
          special_skill?: string | null;
          self_introduction?: string | null;
          profile_image_url?: string | null;
          hourly_rate?: number;
          back_percentage?: number;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cast_performances: {
        Row: {
          id: string;
          cast_id: string;
          date: string;
          shimei_count: number;
          dohan_count: number;
          sales_amount: number;
          drink_count: number;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cast_id: string;
          date: string;
          shimei_count?: number;
          dohan_count?: number;
          sales_amount?: number;
          drink_count?: number;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cast_id?: string;
          date?: string;
          shimei_count?: number;
          dohan_count?: number;
          sales_amount?: number;
          drink_count?: number;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          name_kana: string | null;
          phone_number: string | null;
          line_id: string | null;
          birthday: string | null;
          memo: string | null;
          status: "normal" | "vip" | "caution" | "blacklisted";
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_kana?: string | null;
          phone_number?: string | null;
          line_id?: string | null;
          birthday?: string | null;
          memo?: string | null;
          status?: "normal" | "vip" | "caution" | "blacklisted";
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_kana?: string | null;
          phone_number?: string | null;
          line_id?: string | null;
          birthday?: string | null;
          memo?: string | null;
          status?: "normal" | "vip" | "caution" | "blacklisted";
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      visits: {
        Row: {
          id: string;
          customer_id: string;
          table_id: number;
          check_in_at: string;
          check_out_at: string | null;
          num_guests: number;
          total_amount: number | null;
          status: "active" | "completed" | "cancelled";
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          table_id: number;
          check_in_at?: string;
          check_out_at?: string | null;
          num_guests?: number;
          total_amount?: number | null;
          status?: "active" | "completed" | "cancelled";
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          table_id?: number;
          check_in_at?: string;
          check_out_at?: string | null;
          num_guests?: number;
          total_amount?: number | null;
          status?: "active" | "completed" | "cancelled";
          created_by?: string | null;
          updated_by?: string | null;
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
