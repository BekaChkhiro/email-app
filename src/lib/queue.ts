import { db } from "@/db";
import {
  campaigns,
  campaignRecipients,
  clients,
  emailTemplates,
  emailHistory,
} from "@/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { sendEmail, isResendConfigured } from "./resend";
import { campaignLogger } from "./campaign-logger";
import type { Client } from "@/db/schema";

// Constants
const MAX_EMAILS_PER_CRON_RUN = 3;
const MIN_DELAY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_DELAY_MS = 15 * 60 * 1000; // 15 minutes

export interface QueueResult {
  success: boolean;
  processed: number;
  errors: number;
  campaigns: Array<{
    id: string;
    name: string;
    sent: number;
    failed: number;
  }>;
  message: string;
}

/**
 * Personalize content by replacing template variables with client data
 */
export function personalize(content: string, client: Client): string {
  return content
    .replace(/\{\{company_name\}\}/g, client.companyName || "there")
    .replace(/\{\{email\}\}/g, client.email || "")
    .replace(/\{\{city\}\}/g, client.city || "")
    .replace(/\{\{category\}\}/g, client.category || "")
    .replace(/\{\{website\}\}/g, client.website || "")
    .replace(/\{\{phone\}\}/g, client.phonePrimary || "");
}

/**
 * Check if current time is within sending hours
 */
function isWithinSendingHours(startHour: number, endHour: number): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Get count of emails sent today for a campaign
 */
async function getDailySentCount(campaignId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.campaignId, campaignId),
        eq(campaignRecipients.status, "sent"),
        gte(campaignRecipients.sentAt, today)
      )
    );

  return result[0]?.count || 0;
}

/**
 * Get pending recipients for a campaign
 */
async function getPendingRecipients(
  campaignId: string,
  limit: number
): Promise<
  Array<{
    recipientId: string;
    client: Client;
  }>
> {
  const result = await db
    .select({
      recipientId: campaignRecipients.id,
      client: clients,
    })
    .from(campaignRecipients)
    .innerJoin(clients, eq(campaignRecipients.clientId, clients.id))
    .where(
      and(
        eq(campaignRecipients.campaignId, campaignId),
        eq(campaignRecipients.status, "pending")
      )
    )
    .limit(limit);

  return result;
}

/**
 * Update campaign statistics
 * Returns true if campaign was completed
 */
async function updateCampaignStats(campaignId: string): Promise<boolean> {
  // Get sent count
  const sentResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.campaignId, campaignId),
        eq(campaignRecipients.status, "sent")
      )
    );

  const sentCount = sentResult[0]?.count || 0;

  // Update campaign
  await db
    .update(campaigns)
    .set({ sentCount })
    .where(eq(campaigns.id, campaignId));

  // Check if campaign is complete
  const pendingResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.campaignId, campaignId),
        eq(campaignRecipients.status, "pending")
      )
    );

  const pendingCount = pendingResult[0]?.count || 0;

  if (pendingCount === 0) {
    await db
      .update(campaigns)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));
    return true;
  }
  return false;
}

/**
 * Random delay between emails
 */
function randomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process email queue - main function called by cron
 */
export async function processEmailQueue(): Promise<QueueResult> {
  const result: QueueResult = {
    success: true,
    processed: 0,
    errors: 0,
    campaigns: [],
    message: "",
  };

  // Check if Resend is configured
  if (!isResendConfigured()) {
    result.success = false;
    result.message = "Resend API key not configured";
    return result;
  }

  try {
    // Get all active campaigns
    const activeCampaigns = await db
      .select({
        campaign: campaigns,
        template: emailTemplates,
      })
      .from(campaigns)
      .leftJoin(emailTemplates, eq(campaigns.templateId, emailTemplates.id))
      .where(eq(campaigns.status, "active"));

    if (activeCampaigns.length === 0) {
      result.message = "No active campaigns";
      return result;
    }

    for (const { campaign, template } of activeCampaigns) {
      const campaignResult = {
        id: campaign.id,
        name: campaign.name,
        sent: 0,
        failed: 0,
      };

      // Check sending hours
      const startHour = campaign.sendStartHour || 9;
      const endHour = campaign.sendEndHour || 18;
      if (!isWithinSendingHours(startHour, endHour)) {
        const currentHour = new Date().getHours();
        await campaignLogger.warning(
          campaign.id,
          "outside_sending_hours",
          `Outside sending hours (current: ${currentHour}:00, window: ${startHour}:00-${endHour}:00)`,
          { currentHour, sendWindow: `${startHour}:00-${endHour}:00` }
        );
        campaignResult.sent = 0;
        result.campaigns.push(campaignResult);
        continue;
      }

      // Check daily limit
      const dailySent = await getDailySentCount(campaign.id);
      const dailyLimit = campaign.dailyLimit || 10;

      if (dailySent >= dailyLimit) {
        await campaignLogger.warning(
          campaign.id,
          "daily_limit_reached",
          `Daily limit reached (${dailySent}/${dailyLimit} sent today)`,
          { sentToday: dailySent, dailyLimit }
        );
        result.campaigns.push(campaignResult);
        continue;
      }

      // Calculate how many emails we can send
      const remainingToday = dailyLimit - dailySent;
      const maxToSend = Math.min(remainingToday, MAX_EMAILS_PER_CRON_RUN);

      // Get pending recipients
      const pendingRecipients = await getPendingRecipients(
        campaign.id,
        maxToSend
      );

      if (pendingRecipients.length === 0) {
        await campaignLogger.info(
          campaign.id,
          "no_pending_recipients",
          "No pending recipients to process"
        );
        result.campaigns.push(campaignResult);
        continue;
      }

      // Process each recipient
      for (let i = 0; i < pendingRecipients.length; i++) {
        const { recipientId, client } = pendingRecipients[i];

        // Skip if no email
        if (!client.email) {
          await db
            .update(campaignRecipients)
            .set({
              status: "skipped",
              errorMessage: "No email address",
            })
            .where(eq(campaignRecipients.id, recipientId));
          await campaignLogger.warning(
            campaign.id,
            "recipient_no_email",
            `Skipped: No email address for "${client.companyName || "Unknown"}"`,
            { recipientCompany: client.companyName || "Unknown" }
          );
          continue;
        }

        // Personalize content
        const subject = template
          ? personalize(template.subject, client)
          : "Message";
        const htmlContent = template
          ? personalize(template.htmlContent, client)
          : "<p>Message content</p>";

        // Log sending attempt
        await campaignLogger.info(
          campaign.id,
          "email_sending",
          `Sending email to ${client.email}...`,
          { recipientEmail: client.email, recipientCompany: client.companyName || "Unknown", subject }
        );

        // Send email
        const sendResult = await sendEmail({
          to: client.email,
          subject,
          html: htmlContent,
        });

        if (sendResult.success) {
          // Update recipient status
          await db
            .update(campaignRecipients)
            .set({
              status: "sent",
              sentAt: new Date(),
            })
            .where(eq(campaignRecipients.id, recipientId));

          // Add to email history
          await db.insert(emailHistory).values({
            clientId: client.id,
            campaignId: campaign.id,
            templateId: campaign.templateId,
            subject,
            contentPreview: htmlContent.substring(0, 200),
            resendMessageId: sendResult.messageId,
            status: "sent",
            sentAt: new Date(),
          });

          await campaignLogger.success(
            campaign.id,
            "email_sent",
            `Email sent successfully to ${client.email}`,
            { recipientEmail: client.email, recipientCompany: client.companyName || "Unknown", messageId: sendResult.messageId }
          );

          campaignResult.sent++;
          result.processed++;
        } else {
          // Mark as failed
          await db
            .update(campaignRecipients)
            .set({
              status: "failed",
              errorMessage: sendResult.error,
            })
            .where(eq(campaignRecipients.id, recipientId));

          await campaignLogger.error(
            campaign.id,
            "email_failed",
            `Failed to send email to ${client.email}: ${sendResult.error}`,
            { recipientEmail: client.email, recipientCompany: client.companyName || "Unknown", errorMessage: sendResult.error }
          );

          campaignResult.failed++;
          result.errors++;
        }

        // Add delay between emails (except for last one)
        if (i < pendingRecipients.length - 1) {
          const delay = randomDelay(MIN_DELAY_MS, MAX_DELAY_MS);
          await sleep(delay);
        }
      }

      // Update campaign stats
      const isCompleted = await updateCampaignStats(campaign.id);
      if (isCompleted) {
        await campaignLogger.success(
          campaign.id,
          "campaign_completed",
          "Campaign completed! All emails have been sent.",
          { totalSent: campaignResult.sent }
        );
      }

      result.campaigns.push(campaignResult);
    }

    result.message = `Processed ${result.processed} emails with ${result.errors} errors`;
  } catch (error) {
    result.success = false;
    result.message = error instanceof Error ? error.message : "Unknown error";
  }

  return result;
}

/**
 * Get queue status for dashboard
 */
export async function getQueueStatus(): Promise<{
  activeCampaigns: number;
  pendingEmails: number;
  sentToday: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [activeResult, pendingResult, sentResult] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(eq(campaigns.status, "active")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaignRecipients)
      .where(eq(campaignRecipients.status, "pending")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailHistory)
      .where(gte(emailHistory.sentAt, today)),
  ]);

  return {
    activeCampaigns: activeResult[0]?.count || 0,
    pendingEmails: pendingResult[0]?.count || 0,
    sentToday: sentResult[0]?.count || 0,
  };
}
