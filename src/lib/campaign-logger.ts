import { db } from "@/db";
import { campaignLogs } from "@/db/schema";

export type LogLevel = "info" | "success" | "warning" | "error";

export type LogEvent =
  | "queue_start"
  | "queue_end"
  | "api_not_configured"
  | "no_active_campaigns"
  | "outside_sending_hours"
  | "daily_limit_reached"
  | "no_pending_recipients"
  | "recipient_no_email"
  | "recipient_skipped"
  | "email_sending"
  | "email_sent"
  | "email_failed"
  | "campaign_started"
  | "campaign_paused"
  | "campaign_resumed"
  | "campaign_stopped"
  | "campaign_completed"
  | "processing_error"
  | "processor_error"
  | "resend_not_configured"
  | "waiting_for_send_window"
  | "next_email_scheduled";

export interface LogMetadata {
  recipientEmail?: string;
  recipientCompany?: string;
  messageId?: string;
  errorMessage?: string;
  sentToday?: number;
  dailyLimit?: number;
  currentHour?: number;
  sendWindow?: string;
  subject?: string;
  totalRecipients?: number;
  delaySeconds?: number;
  [key: string]: unknown;
}

export async function logCampaignEvent(
  campaignId: string,
  level: LogLevel,
  event: LogEvent,
  message: string,
  metadata?: LogMetadata
): Promise<void> {
  try {
    await db.insert(campaignLogs).values({
      campaignId,
      level,
      event,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (error) {
    // Don't let logging failures break the queue processing
    console.error("Failed to write campaign log:", error);
  }
}

// Helper functions for common log types
export const campaignLogger = {
  info: (campaignId: string, event: LogEvent, message: string, metadata?: LogMetadata) =>
    logCampaignEvent(campaignId, "info", event, message, metadata),

  success: (campaignId: string, event: LogEvent, message: string, metadata?: LogMetadata) =>
    logCampaignEvent(campaignId, "success", event, message, metadata),

  warning: (campaignId: string, event: LogEvent, message: string, metadata?: LogMetadata) =>
    logCampaignEvent(campaignId, "warning", event, message, metadata),

  error: (campaignId: string, event: LogEvent, message: string, metadata?: LogMetadata) =>
    logCampaignEvent(campaignId, "error", event, message, metadata),
};
