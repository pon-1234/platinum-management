/**
 * カスタムエラークラス - 顧客分析関連
 */

export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AnalyticsError";
  }
}

export class CustomerNotFoundError extends AnalyticsError {
  constructor(customerId: string) {
    super(
      `顧客が見つかりません (ID: ${customerId})`,
      "CUSTOMER_NOT_FOUND",
      404
    );
    this.name = "CustomerNotFoundError";
  }
}

export class InvalidDateRangeError extends AnalyticsError {
  constructor(message?: string) {
    super(
      message || "無効な日付範囲が指定されました",
      "INVALID_DATE_RANGE",
      400
    );
    this.name = "InvalidDateRangeError";
  }
}

export class InsufficientDataError extends AnalyticsError {
  constructor(message?: string) {
    super(
      message || "分析に必要なデータが不足しています",
      "INSUFFICIENT_DATA",
      422
    );
    this.name = "InsufficientDataError";
  }
}

export class DatabaseConnectionError extends AnalyticsError {
  constructor(originalError?: Error) {
    super(
      "データベース接続エラーが発生しました",
      "DATABASE_CONNECTION_ERROR",
      503
    );
    this.name = "DatabaseConnectionError";
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class PermissionDeniedError extends AnalyticsError {
  constructor(resource?: string) {
    super(
      resource
        ? `${resource}へのアクセス権限がありません`
        : "このリソースへのアクセス権限がありません",
      "PERMISSION_DENIED",
      403
    );
    this.name = "PermissionDeniedError";
  }
}

export class RateLimitError extends AnalyticsError {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `リクエスト制限に達しました。${retryAfter}秒後に再試行してください`
      : "リクエスト制限に達しました";
    super(message, "RATE_LIMIT_EXCEEDED", 429);
    this.name = "RateLimitError";
  }
}

/**
 * Supabaseエラーをカスタムエラーに変換
 */
export function parseSupabaseError(error: any): AnalyticsError {
  // Supabaseのエラーコードに基づいて適切なエラーを返す
  if (!error) {
    return new AnalyticsError("不明なエラーが発生しました");
  }

  const code = error.code || error.error_code;
  const message =
    error.message || error.error_description || "エラーが発生しました";

  switch (code) {
    case "PGRST116": // Not Found
      return new CustomerNotFoundError("unknown");

    case "PGRST301": // Unauthorized
    case "PGRST302": // Forbidden
      return new PermissionDeniedError();

    case "PGRST503": // Service Unavailable
    case "PGRST504": // Gateway Timeout
      return new DatabaseConnectionError(error);

    case "22P02": // Invalid text representation
    case "22003": // Numeric value out of range
      return new InvalidDateRangeError("無効なパラメータが指定されました");

    case "P0001": // Custom PostgreSQL error
      // カスタムエラーメッセージを解析
      if (message.includes("insufficient")) {
        return new InsufficientDataError(message);
      }
      break;

    case "429": // Too Many Requests
      return new RateLimitError();

    default:
      // その他のエラーはステータスコードで判断
      if (error.status === 404) {
        return new CustomerNotFoundError("unknown");
      }
      if (error.status === 403) {
        return new PermissionDeniedError();
      }
      if (error.status === 429) {
        return new RateLimitError();
      }
  }

  return new AnalyticsError(message, code);
}
