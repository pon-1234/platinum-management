import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { toSnakeCase, toCamelCase } from "@/lib/utils/transform";
import { authManager } from "@/lib/auth/authManager";

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
    // First, try to get from auth manager (cached value)
    const cachedStaffId = authManager.getStaffId();
    if (cachedStaffId) {
      return cachedStaffId;
    }

    // Fallback: If not in cache, fetch from database (for backward compatibility)
    console.warn(
      "AuthManager cache miss in getCurrentStaffId(). " +
        "This may indicate an initialization issue or the user is not yet fully authenticated. " +
        "Falling back to database query."
    );

    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) return null;

    const { data: staff, error } = await this.supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Failed to fetch staff ID from database:", error);
      return null;
    }

    // Log for debugging if there's a mismatch between expected auth state
    if (staff?.id) {
      console.info(
        `Retrieved staff ID from database: ${staff.id} for user: ${user.id}. ` +
          "Consider ensuring AuthManager is properly initialized to avoid this fallback."
      );
    }

    return staff?.id || null;
  }

  /**
   * Check if the current user has permission for a resource and action
   * Note: This is a client-side check. Real permission enforcement happens via RLS on the server
   * @param resource The resource to check permission for
   * @param action The action to perform
   * @returns Whether the user has permission
   */
  protected async hasPermission(
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const { data } = await this.supabase.rpc("has_permission", {
        user_id: (await this.supabase.auth.getUser()).data.user?.id,
        resource,
        action,
      });

      return data || false;
    } catch (error) {
      console.error("Permission check failed:", error);
      return false;
    }
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
    console.error("Database error details:", error);
    const message = this.handleDatabaseError(error, defaultMessage);

    // より詳細なエラー情報を含む
    const errorDetails = error as {
      message?: string;
      details?: string;
      hint?: string;
    };
    const detailedMessage = errorDetails.message
      ? `${message}: ${errorDetails.message}`
      : message;

    throw new Error(detailedMessage);
  }
}
