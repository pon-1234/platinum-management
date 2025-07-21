import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { toSnakeCase, toCamelCase } from "@/lib/utils/transform";

export abstract class BaseService {
  protected supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Get the current authenticated staff ID
   * @returns The staff ID or null if not authenticated
   */
  protected async getCurrentStaffId(): Promise<string | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) return null;

    const { data: staff } = await this.supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user.id)
      .single();

    return staff?.id || null;
  }

  /**
   * Handle common Supabase errors
   * @param error The error object from Supabase
   * @param defaultMessage The default error message
   * @returns A user-friendly error message
   */
  protected handleDatabaseError(
    error: unknown,
    defaultMessage: string
  ): string {
    const errorObj = error as { code?: string };
    if (errorObj?.code === "23505") {
      // Unique constraint violation
      return "既に同じデータが存在します";
    }
    if (errorObj?.code === "PGRST116") {
      // No rows found
      return "データが見つかりません";
    }
    if (errorObj?.code === "23503") {
      // Foreign key violation
      return "関連するデータが存在しません";
    }
    return defaultMessage;
  }

  /**
   * Get current staff ID - alias for backward compatibility
   */
  protected async getStaffId(): Promise<string | null> {
    return this.getCurrentStaffId();
  }

  /**
   * Convert data to snake_case for database operations
   */
  protected toSnakeCase<T>(data: T): T {
    return toSnakeCase(data) as T;
  }

  /**
   * Convert data to camelCase from database
   */
  protected toCamelCase<T>(data: T): T {
    return toCamelCase(data) as T;
  }

  /**
   * Handle error and throw appropriate message
   */
  protected handleError(
    error: unknown,
    defaultMessage = "操作に失敗しました"
  ): never {
    const message = this.handleDatabaseError(error, defaultMessage);
    throw new Error(message);
  }
}
