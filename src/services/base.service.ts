import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { toSnakeCase, toCamelCase } from "@/lib/utils/transform";
import { logger } from "@/lib/logger";

export abstract class BaseService {
  private _cachedStaffId: string | null = null;
  private _cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ

  // Permission caching
  private _permissionCache = new Map<
    string,
    { result: boolean; expiry: number }
  >();
  private readonly PERMISSION_CACHE_DURATION = 2 * 60 * 1000; // 2分間キャッシュ

  // Track all instances for global cache clearing
  private static instances: BaseService[] = [];

  /**
   * Clear caches across all service instances (for sign out)
   */
  static clearAllInstanceCaches(): void {
    BaseService.instances.forEach((instance) => {
      instance.clearAllCaches();
    });
  }

  constructor() {
    BaseService.instances.push(this);
  }

  /**
   * Get the current authenticated staff ID
   * ストアからキャッシュされたスタッフIDを取得、ない場合はデータベースから取得
   * @returns The staff ID or null if not authenticated
   */
  protected async getCurrentStaffId(
    supabase: SupabaseClient<Database>
  ): Promise<string | null> {
    // Note: Store access removed to avoid circular dependency
    // Staff ID is cached at instance level instead

    // キャッシュが有効かどうかチェック
    const now = Date.now();
    if (this._cachedStaffId && now < this._cacheExpiry) {
      return this._cachedStaffId;
    }

    // キャッシュが無いか期限切れの場合、データベースから取得
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      this._cachedStaffId = null;
      this._cacheExpiry = 0;
      return null;
    }

    const { data: staff, error } = await supabase
      .from("staffs")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (error) {
      logger.logDatabaseError(error, "select staff id by user_id", "staffs");
      return null;
    }

    const staffId = staff?.id || null;

    // キャッシュを更新
    this._cachedStaffId = staffId;
    this._cacheExpiry = now + this.CACHE_DURATION;

    return staffId;
  }

  /**
   * キャッシュされたスタッフIDをクリアする（サインアウト時などに使用）
   */
  protected clearStaffIdCache(): void {
    this._cachedStaffId = null;
    this._cacheExpiry = 0;
  }

  /**
   * パーミッションキャッシュをクリアする（サインアウト時や権限変更時に使用）
   */
  protected clearPermissionCache(): void {
    this._permissionCache.clear();
  }

  /**
   * 全てのキャッシュをクリアする
   */
  protected clearAllCaches(): void {
    this.clearStaffIdCache();
    this.clearPermissionCache();
  }

  /**
   * Check if the current user has permission for a resource and action
   * Note: This is a client-side check. Real permission enforcement happens via RLS on the server
   * @param resource The resource to check permission for
   * @param action The action to perform
   * @returns Whether the user has permission
   */
  protected async hasPermission(
    supabase: SupabaseClient<Database>,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        return false;
      }

      // Create cache key
      const cacheKey = `${user.id}:${resource}:${action}`;
      const now = Date.now();

      // Check cache first
      const cached = this._permissionCache.get(cacheKey);
      if (cached && cached.expiry > now) {
        return cached.result;
      }

      // Fetch from database
      const { data } = await supabase.rpc("has_permission", {
        user_id: user.id,
        resource,
        action,
      });

      const result = data || false;

      // Cache the result
      this._permissionCache.set(cacheKey, {
        result,
        expiry: now + this.PERMISSION_CACHE_DURATION,
      });

      return result;
    } catch (error) {
      logger.error("Permission check failed", error, "BaseService");
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
  protected async getStaffId(
    supabase: SupabaseClient<Database>
  ): Promise<string | null> {
    return this.getCurrentStaffId(supabase);
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
    logger.error("Database error", error, "BaseService");
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

  /**
   * Apply a NULL filter that works in both runtime and test mocks.
   * Some test mocks don't implement `.is(col, null)`, so we fall back to `.eq(col, null)`.
   * Returns the same builder so further chaining (order/limit) can be applied.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected applyWhereNull(builder: any, column: string) {
    if (typeof builder?.is === "function") {
      return builder.is(column, null);
    }
    if (typeof builder?.eq === "function") {
      return builder.eq(column, null as unknown as string);
    }
    return builder;
  }
}
