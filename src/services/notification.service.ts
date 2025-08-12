import { BaseService } from "./base.service";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface NotificationChannel {
  type: "email" | "sms" | "line";
  recipient: string;
  content: {
    subject?: string;
    message: string;
  };
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface AlertNotificationData {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerLineId?: string;
  productName: string;
  alertType: string;
  alertMessage: string;
}

/**
 * 通知サービス
 * メール、SMS、LINE通知を管理する
 */
export class NotificationService extends BaseService {
  private supabase: SupabaseClient<Database>;
  constructor() {
    super();
    this.supabase = createClient();
  }

  /**
   * ボトルキープアラートを送信
   */
  async sendBottleKeepAlert(
    alertData: AlertNotificationData
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const channels = this.prepareNotificationChannels(alertData);

    // 並列で通知を送信
    const promises = channels.map(async (channel) => {
      try {
        const result = await this.sendNotification(channel);
        results.push(result);
        return result;
      } catch (error) {
        const failedResult: NotificationResult = {
          channel,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
        results.push(failedResult);
        return failedResult;
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * 複数のアラートを一括送信
   */
  async sendBulkBottleKeepAlerts(alerts: AlertNotificationData[]): Promise<{
    totalAlerts: number;
    successCount: number;
    failedCount: number;
    results: NotificationResult[];
  }> {
    const allResults: NotificationResult[] = [];

    for (const alert of alerts) {
      const results = await this.sendBottleKeepAlert(alert);
      allResults.push(...results);
    }

    const successCount = allResults.filter((r) => r.success).length;
    const failedCount = allResults.length - successCount;

    return {
      totalAlerts: alerts.length,
      successCount,
      failedCount,
      results: allResults,
    };
  }

  /**
   * 通知チャンネルを準備
   */
  private prepareNotificationChannels(
    alertData: AlertNotificationData
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    const subject = this.getSubjectByAlertType(alertData.alertType);

    // メール通知
    if (alertData.customerEmail) {
      channels.push({
        type: "email",
        recipient: alertData.customerEmail,
        content: {
          subject,
          message: this.formatEmailMessage(alertData),
        },
      });
    }

    // SMS通知
    if (alertData.customerPhone) {
      channels.push({
        type: "sms",
        recipient: alertData.customerPhone,
        content: {
          message: this.formatSmsMessage(alertData),
        },
      });
    }

    // LINE通知
    if (alertData.customerLineId) {
      channels.push({
        type: "line",
        recipient: alertData.customerLineId,
        content: {
          message: this.formatLineMessage(alertData),
        },
      });
    }

    return channels;
  }

  /**
   * 単一の通知を送信
   */
  private async sendNotification(
    channel: NotificationChannel
  ): Promise<NotificationResult> {
    switch (channel.type) {
      case "email":
        return await this.sendEmail(channel);
      case "sms":
        return await this.sendSms(channel);
      case "line":
        return await this.sendLineMessage(channel);
      default:
        throw new Error(`Unsupported notification type: ${channel.type}`);
    }
  }

  /**
   * メール送信
   */
  private async sendEmail(
    channel: NotificationChannel
  ): Promise<NotificationResult> {
    try {
      // 本番環境では実際のメール送信サービス（SendGrid、AWS SES等）を使用
      // 開発環境では通知の記録のみ
      await this.logNotification("email", channel);

      // TODO: 実際のメール送信ロジックを実装
      // 例: SendGrid、AWS SES、Resend等のサービスを使用

      return {
        channel,
        success: true,
        messageId: `email-${Date.now()}`,
      };
    } catch (error) {
      return {
        channel,
        success: false,
        error: error instanceof Error ? error.message : "Email sending failed",
      };
    }
  }

  /**
   * SMS送信
   */
  private async sendSms(
    channel: NotificationChannel
  ): Promise<NotificationResult> {
    try {
      // 本番環境では実際のSMS送信サービス（Twilio、AWS SNS等）を使用
      // 開発環境では通知の記録のみ
      await this.logNotification("sms", channel);

      // TODO: 実際のSMS送信ロジックを実装
      // 例: Twilio、AWS SNS等のサービスを使用

      return {
        channel,
        success: true,
        messageId: `sms-${Date.now()}`,
      };
    } catch (error) {
      return {
        channel,
        success: false,
        error: error instanceof Error ? error.message : "SMS sending failed",
      };
    }
  }

  /**
   * LINE メッセージ送信
   */
  private async sendLineMessage(
    channel: NotificationChannel
  ): Promise<NotificationResult> {
    try {
      // 本番環境では実際のLINE Messaging APIを使用
      // 開発環境では通知の記録のみ
      await this.logNotification("line", channel);

      // TODO: 実際のLINE Messaging API呼び出しを実装
      // LINE Bot APIのアクセストークンが必要

      return {
        channel,
        success: true,
        messageId: `line-${Date.now()}`,
      };
    } catch (error) {
      return {
        channel,
        success: false,
        error: error instanceof Error ? error.message : "LINE sending failed",
      };
    }
  }

  /**
   * 通知をデータベースにログ記録
   */
  private async logNotification(
    type: string,
    channel: NotificationChannel
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from("notification_logs").insert({
        type,
        recipient: channel.recipient,
        subject: channel.content.subject || null,
        message: channel.content.message,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      if (error) {
        logger.error("Notification log error", error, "NotificationService");
      }
    } catch (error) {
      logger.error("Failed to log notification", error, "NotificationService");
    }
  }

  /**
   * アラートタイプに基づいた件名を生成
   */
  private getSubjectByAlertType(alertType: string): string {
    switch (alertType) {
      case "expired":
        return "【期限切れ】ボトルキープのお知らせ";
      case "expiring_3days":
        return "【期限間近】ボトルキープのお知らせ";
      case "expiring_7days":
      case "expiring_30days":
        return "【期限通知】ボトルキープのお知らせ";
      case "low_amount":
        return "【残量わずか】ボトルキープのお知らせ";
      default:
        return "ボトルキープのお知らせ";
    }
  }

  /**
   * メール用のメッセージをフォーマット
   */
  private formatEmailMessage(alertData: AlertNotificationData): string {
    return `
${alertData.customerName} 様

いつもご来店いただき、ありがとうございます。

${alertData.alertMessage}

お早めにご来店いただき、ご利用をお願いいたします。

今後ともよろしくお願いいたします。

━━━━━━━━━━━━━━━━━━━━━━━━━━
Platinum Management System
━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  /**
   * SMS用のメッセージをフォーマット
   */
  private formatSmsMessage(alertData: AlertNotificationData): string {
    return `【Platinum】${alertData.customerName}様 ${alertData.alertMessage} お早めにご来店ください。`;
  }

  /**
   * LINE用のメッセージをフォーマット
   */
  private formatLineMessage(alertData: AlertNotificationData): string {
    return `
🍾 ${alertData.customerName}様

${alertData.alertMessage}

お早めにご来店いただき、ご利用をお願いいたします✨

いつもありがとうございます🙏
`;
  }
}

export const notificationService = new NotificationService();
