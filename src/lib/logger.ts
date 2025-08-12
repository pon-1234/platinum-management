/**
 * ログレベル定義
 */
export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

/**
 * ログエントリの型定義
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  error?: Error | unknown;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  requestId?: string;
}

/**
 * ロガークラス
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";

  /**
   * エラーログを記録
   */
  error(
    message: string,
    error?: Error | unknown,
    context?: string,
    metadata?: Record<string, unknown>
  ) {
    this.log({
      level: LogLevel.ERROR,
      message,
      error,
      context,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * 警告ログを記録
   */
  warn(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.log({
      level: LogLevel.WARN,
      message,
      context,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * 情報ログを記録
   */
  info(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.log({
      level: LogLevel.INFO,
      message,
      context,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * デバッグログを記録（開発環境のみ）
   */
  debug(message: string, context?: string, metadata?: Record<string, unknown>) {
    if (this.isDevelopment) {
      this.log({
        level: LogLevel.DEBUG,
        message,
        context,
        metadata,
        timestamp: new Date(),
      });
    }
  }

  /**
   * ログを出力
   */
  private log(entry: LogEntry) {
    // 開発環境ではコンソールに出力
    if (this.isDevelopment) {
      const logMethod =
        entry.level === LogLevel.ERROR ? console.error : console.log;
      const logMessage = this.formatLogMessage(entry);

      logMethod(logMessage);

      if (entry.error) {
        console.error("Error details:", entry.error);
      }
    }

    // 本番環境では外部ログサービスに送信
    // TODO: Sentry, DataDog, CloudWatch などへの送信実装
    if (!this.isDevelopment && entry.level === LogLevel.ERROR) {
      // 例: Sentryへの送信
      // Sentry.captureException(entry.error, {
      //   level: 'error',
      //   tags: { context: entry.context },
      //   extra: entry.metadata,
      // });
    }
  }

  /**
   * ログメッセージをフォーマット
   */
  private formatLogMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase();
    const context = entry.context ? `[${entry.context}]` : "";
    const req = entry.requestId ? `(req:${entry.requestId})` : "";

    let message = `${timestamp} ${level} ${context} ${req} ${entry.message}`;

    if (entry.metadata) {
      message += ` | metadata: ${JSON.stringify(entry.metadata)}`;
    }

    return message;
  }

  /**
   * データベースエラーを解析して詳細情報を記録
   */
  logDatabaseError(error: unknown, operation: string, tableName?: string) {
    const errorObj = error as {
      code?: string;
      message?: string;
      details?: string;
    };

    const metadata: Record<string, unknown> = {
      operation,
      tableName,
      errorCode: errorObj.code,
      errorDetails: errorObj.details,
    };

    // エラーコードに基づいて適切なメッセージを生成
    let message = `Database operation failed: ${operation}`;

    if (errorObj.code === "23505") {
      message = `Duplicate key violation in ${tableName || "unknown table"}`;
    } else if (errorObj.code === "23503") {
      message = `Foreign key constraint violation in ${tableName || "unknown table"}`;
    } else if (errorObj.code === "PGRST116") {
      message = `No rows found for ${operation} in ${tableName || "unknown table"}`;
    }

    this.error(message, error, "Database", metadata);
  }
}

// シングルトンインスタンス
export const logger = new Logger();
