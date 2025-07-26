import { BaseService } from "../base.service";
import type {
  ShiftTemplate,
  ConfirmedShift,
  CreateShiftTemplateData,
  UpdateShiftTemplateData,
  CreateConfirmedShiftData,
  ConfirmedShiftSearchParams,
  WeeklySchedule,
  CalendarShift,
  DailySchedule,
  ShiftType,
} from "@/types/attendance.types";
import type { Database } from "@/types/database.types";

export class ShiftScheduleService extends BaseService {
  constructor() {
    super();
  }

  // ============= SHIFT TEMPLATE MANAGEMENT =============

  async createTemplate(data: CreateShiftTemplateData): Promise<ShiftTemplate> {
    try {
      const staffId = await this.getCurrentStaffId();

      const { data: template, error } = await this.supabase
        .from("shift_templates")
        .insert(
          this.toSnakeCase({
            name: data.name,
            startTime: data.startTime,
            endTime: data.endTime,
            daysOfWeek: data.daysOfWeek,
            isActive: data.isActive ?? true,
            createdBy: staffId,
            updatedBy: staffId,
          })
        )
        .select()
        .single();

      if (error) {
        throw new Error(
          this.handleDatabaseError(
            error,
            "シフトテンプレートの作成に失敗しました"
          )
        );
      }

      return this.mapToShiftTemplate(template);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("createShiftTemplate failed:", error);
      }
      throw error;
    }
  }

  async getTemplateById(id: string): Promise<ShiftTemplate | null> {
    try {
      const { data, error } = await this.supabase
        .from("shift_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw new Error(
          this.handleDatabaseError(
            error,
            "シフトテンプレートの取得に失敗しました"
          )
        );
      }

      return this.mapToShiftTemplate(data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getShiftTemplateById failed:", error);
      }
      throw error;
    }
  }

  async getAllTemplates(): Promise<ShiftTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from("shift_templates")
        .select("*")
        .order("name");

      if (error) {
        throw new Error(
          this.handleDatabaseError(
            error,
            "シフトテンプレートの取得に失敗しました"
          )
        );
      }

      return data.map(this.mapToShiftTemplate);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getAllShiftTemplates failed:", error);
      }
      throw error;
    }
  }

  async updateTemplate(
    id: string,
    data: UpdateShiftTemplateData
  ): Promise<ShiftTemplate> {
    try {
      const staffId = await this.getCurrentStaffId();

      const updateData = this.toSnakeCase({
        updatedBy: staffId,
        ...data,
      });

      const { data: template, error } = await this.supabase
        .from("shift_templates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(
          this.handleDatabaseError(
            error,
            "シフトテンプレートの更新に失敗しました"
          )
        );
      }

      return this.mapToShiftTemplate(template);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("updateShiftTemplate failed:", error);
      }
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("shift_templates")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(
          this.handleDatabaseError(
            error,
            "シフトテンプレートの削除に失敗しました"
          )
        );
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("deleteShiftTemplate failed:", error);
      }
      throw error;
    }
  }

  // ============= CONFIRMED SHIFT MANAGEMENT =============

  async createConfirmedShift(
    data: CreateConfirmedShiftData
  ): Promise<ConfirmedShift> {
    try {
      const staffId = await this.getCurrentStaffId();

      const { data: shift, error } = await this.supabase
        .from("confirmed_shifts")
        .insert({
          staff_id: data.staffId,
          shift_date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          shift_type: "regular",
          notes: data.notes || null,
          created_by: staffId,
          updated_by: staffId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "確定シフトの作成に失敗しました")
        );
      }

      return this.mapToConfirmedShift(shift);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("createConfirmedShift failed:", error);
      }
      throw error;
    }
  }

  async searchConfirmedShifts(
    params: ConfirmedShiftSearchParams = {}
  ): Promise<ConfirmedShift[]> {
    try {
      let query = this.supabase
        .from("confirmed_shifts")
        .select("*")
        .order("shift_date", { ascending: true });

      if (params.staffId) {
        query = query.eq("staff_id", params.staffId);
      }

      if (params.startDate) {
        query = query.gte("shift_date", params.startDate);
      }

      if (params.endDate) {
        query = query.lte("shift_date", params.endDate);
      }

      // Note: confirmed_shifts table doesn't have status column in database
      // if (params.status) {
      //   query = query.eq("status", params.status);
      // }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      if (params.offset) {
        query = query.range(
          params.offset,
          params.offset + (params.limit || 50) - 1
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "確定シフトの検索に失敗しました")
        );
      }

      return data.map(this.mapToConfirmedShift);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("searchConfirmedShifts failed:", error);
      }
      throw error;
    }
  }

  async deleteConfirmedShift(shiftId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("confirmed_shifts")
        .delete()
        .eq("id", shiftId);

      if (error) {
        throw new Error(
          this.handleDatabaseError(error, "シフトの削除に失敗しました")
        );
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to delete confirmed shift:", error);
      }
      throw error;
    }
  }

  async getWeeklySchedule(weekStart: string): Promise<WeeklySchedule> {
    try {
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);

      const weekEnd = weekEndDate.toISOString().split("T")[0];

      const shifts = await this.searchConfirmedShifts({
        startDate: weekStart,
        endDate: weekEnd,
      });

      const shiftsByDate: Record<string, CalendarShift[]> = {};

      shifts.forEach((shift) => {
        if (!shiftsByDate[shift.date]) {
          shiftsByDate[shift.date] = [];
        }

        shiftsByDate[shift.date].push(
          this.mapConfirmedShiftToCalendarShift(shift)
        );
      });

      const days: DailySchedule[] = [];
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStartDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = currentDate.toISOString().split("T")[0];

        const dayShifts = shiftsByDate[dateStr] || [];

        days.push({
          date: dateStr,
          shifts: dayShifts,
          totalStaff: dayShifts.length,
          confirmedStaff: dayShifts.length,
        });
      }

      return {
        weekStart,
        weekEnd,
        days,
      };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("getWeeklySchedule failed:", error);
      }
      throw error;
    }
  }

  private mapConfirmedShiftToCalendarShift(
    shift: ConfirmedShift
  ): CalendarShift {
    return {
      id: shift.id,
      staffId: shift.staffId,
      staffName: shift.staffName || `Staff ${shift.staffId}`,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      shiftType: this.determineShiftType(shift),
      shiftStatus: shift.status as
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled",
      isConfirmed: shift.status !== "cancelled",
    };
  }

  private determineShiftType(shift: ConfirmedShift): ShiftType {
    const startHour = parseInt(shift.startTime.split(":")[0]);
    const endHour = parseInt(shift.endTime.split(":")[0]);
    const workHours = endHour - startHour;

    if (workHours > 8) {
      return "overtime";
    }

    const shiftDate = new Date(shift.date);
    const dayOfWeek = shiftDate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return "holiday";
    }

    return "regular";
  }

  private mapToShiftTemplate(
    data: Database["public"]["Tables"]["shift_templates"]["Row"]
  ): ShiftTemplate {
    return this.toCamelCase({
      id: data.id,
      name: data.name,
      startTime: data.start_time,
      endTime: data.end_time,
      daysOfWeek: data.days_of_week,
      isActive: data.is_active,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }) as ShiftTemplate;
  }

  private mapToConfirmedShift(
    data: Database["public"]["Tables"]["confirmed_shifts"]["Row"]
  ): ConfirmedShift {
    return {
      id: data.id,
      staffId: data.staff_id,
      shiftTemplateId: null,
      shiftRequestId: null,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      status: "scheduled" as const,
      notes: data.notes,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const shiftScheduleService = new ShiftScheduleService();
