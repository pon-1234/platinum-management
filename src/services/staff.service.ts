import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  Staff,
  CastProfile,
  CreateStaffData,
  UpdateStaffData,
  CreateCastProfileData,
  UpdateCastProfileData,
} from "@/types/staff.types";

export class StaffService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createClient();
  }

  async createStaff(data: CreateStaffData): Promise<Staff> {
    const { data: staff, error } = await this.supabase
      .from("staffs")
      .insert({
        user_id: data.userId,
        full_name: data.fullName,
        role: data.role,
        hire_date: data.hireDate || new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create staff: ${error.message}`);
    }

    return this.mapToStaff(staff);
  }

  async getStaffById(id: string): Promise<Staff | null> {
    const { data, error } = await this.supabase
      .from("staffs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch staff: ${error.message}`);
    }

    return this.mapToStaff(data);
  }

  async getStaffByUserId(userId: string): Promise<Staff | null> {
    const { data, error } = await this.supabase
      .from("staffs")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch staff by user ID: ${error.message}`);
    }

    return this.mapToStaff(data);
  }

  async getAllStaff(): Promise<Staff[]> {
    const { data, error } = await this.supabase
      .from("staffs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch staff list: ${error.message}`);
    }

    return data.map(this.mapToStaff);
  }

  async updateStaff(id: string, data: UpdateStaffData): Promise<Staff> {
    const { data: staff, error } = await this.supabase
      .from("staffs")
      .update({
        full_name: data.fullName,
        role: data.role,
        is_active: data.isActive,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update staff: ${error.message}`);
    }

    return this.mapToStaff(staff);
  }

  async deleteStaff(id: string): Promise<void> {
    const { error } = await this.supabase.from("staffs").delete().eq("id", id);

    if (error) {
      throw new Error(`Failed to delete staff: ${error.message}`);
    }
  }

  async createCastProfile(data: CreateCastProfileData): Promise<CastProfile> {
    const { data: profile, error } = await this.supabase
      .from("casts_profile")
      .insert({
        staff_id: data.staffId,
        nickname: data.nickname,
        profile_image_url: data.profileImageUrl || null,
        bio: data.bio || null,
        hourly_wage: data.hourlyWage || 0,
        commission_rate: data.commissionRate || { shimei: 0, bottlePercent: 0 },
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create cast profile: ${error.message}`);
    }

    return this.mapToCastProfile(profile);
  }

  async getCastProfile(staffId: string): Promise<CastProfile | null> {
    const { data, error } = await this.supabase
      .from("casts_profile")
      .select("*")
      .eq("staff_id", staffId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to fetch cast profile: ${error.message}`);
    }

    return this.mapToCastProfile(data);
  }

  async getAllCastProfiles(): Promise<CastProfile[]> {
    const { data, error } = await this.supabase
      .from("casts_profile")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch cast profiles: ${error.message}`);
    }

    return data.map(this.mapToCastProfile);
  }

  async updateCastProfile(
    staffId: string,
    data: UpdateCastProfileData
  ): Promise<CastProfile> {
    const { data: profile, error } = await this.supabase
      .from("casts_profile")
      .update({
        nickname: data.nickname,
        profile_image_url: data.profileImageUrl,
        bio: data.bio,
        hourly_wage: data.hourlyWage,
        commission_rate: data.commissionRate,
      })
      .eq("staff_id", staffId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update cast profile: ${error.message}`);
    }

    return this.mapToCastProfile(profile);
  }

  private mapToStaff(
    data: Database["public"]["Tables"]["staffs"]["Row"]
  ): Staff {
    return {
      id: data.id,
      userId: data.user_id,
      fullName: data.full_name,
      role: data.role,
      hireDate: data.hire_date,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToCastProfile(
    data: Database["public"]["Tables"]["casts_profile"]["Row"]
  ): CastProfile {
    return {
      staffId: data.staff_id,
      nickname: data.nickname,
      profileImageUrl: data.profile_image_url,
      bio: data.bio,
      hourlyWage: data.hourly_wage,
      commissionRate: data.commission_rate as {
        shimei: number;
        bottlePercent: number;
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
