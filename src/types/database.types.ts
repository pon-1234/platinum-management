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
          subtotal: number | null;
          service_charge: number | null;
          tax_amount: number | null;
          total_amount: number | null;
          payment_method: string | null;
          payment_status: "pending" | "completed" | "cancelled";
          status: "active" | "completed" | "cancelled";
          notes: string | null;
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
          num_guests: number;
          subtotal?: number | null;
          service_charge?: number | null;
          tax_amount?: number | null;
          total_amount?: number | null;
          payment_method?: string | null;
          payment_status?: "pending" | "completed" | "cancelled";
          status?: "active" | "completed" | "cancelled";
          notes?: string | null;
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
          subtotal?: number | null;
          service_charge?: number | null;
          tax_amount?: number | null;
          total_amount?: number | null;
          payment_method?: string | null;
          payment_status?: "pending" | "completed" | "cancelled";
          status?: "active" | "completed" | "cancelled";
          notes?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tables: {
        Row: {
          id: string;
          table_name: string;
          capacity: number;
          location: string | null;
          is_vip: boolean;
          is_active: boolean;
          current_status: Database["public"]["Enums"]["table_status"];
          current_visit_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          capacity: number;
          location?: string | null;
          is_vip?: boolean;
          is_active?: boolean;
          current_status?: Database["public"]["Enums"]["table_status"];
          current_visit_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_name?: string;
          capacity?: number;
          location?: string | null;
          is_vip?: boolean;
          is_active?: boolean;
          current_status?: Database["public"]["Enums"]["table_status"];
          current_visit_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reservations: {
        Row: {
          id: string;
          customer_id: string;
          table_id: string | null;
          reservation_date: string;
          reservation_time: string;
          number_of_guests: number;
          assigned_cast_id: string | null;
          special_requests: string | null;
          status: Database["public"]["Enums"]["reservation_status"];
          checked_in_at: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          table_id?: string | null;
          reservation_date: string;
          reservation_time: string;
          number_of_guests: number;
          assigned_cast_id?: string | null;
          special_requests?: string | null;
          status?: Database["public"]["Enums"]["reservation_status"];
          checked_in_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          table_id?: string | null;
          reservation_date?: string;
          reservation_time?: string;
          number_of_guests?: number;
          assigned_cast_id?: string | null;
          special_requests?: string | null;
          status?: Database["public"]["Enums"]["reservation_status"];
          checked_in_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: number;
          name: string;
          category: string;
          price: number;
          cost: number;
          stock_quantity: number;
          low_stock_threshold: number;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          category: string;
          price: number;
          cost?: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          category?: string;
          price?: number;
          cost?: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: number;
          visit_id: string;
          product_id: number;
          cast_id: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          visit_id: string;
          product_id: number;
          cast_id?: string | null;
          quantity: number;
          unit_price: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          visit_id?: string;
          product_id?: number;
          cast_id?: string | null;
          quantity?: number;
          unit_price?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_table_availability: {
        Args: {
          p_table_id: string;
          p_reservation_date: string;
          p_reservation_time: string;
          p_exclude_reservation_id?: string;
        };
        Returns: boolean;
      };
      get_cast_ranking: {
        Args: {
          start_date: string;
          end_date: string;
          limit_count: number;
        };
        Returns: Array<{
          cast_id: string;
          cast_name: string;
          total_shimei: number;
          total_dohan: number;
          total_sales: number;
          total_drinks: number;
          rank: number;
        }>;
      };
      calculate_visit_totals: {
        Args: {
          visit_id_param: string;
        };
        Returns: Array<{
          subtotal: number;
          service_charge: number;
          tax_amount: number;
          total_amount: number;
        }>;
      };
    };
    Enums: {
      table_status: "available" | "reserved" | "occupied" | "cleaning";
      reservation_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "completed"
        | "cancelled"
        | "no_show";
    };
  };
}
