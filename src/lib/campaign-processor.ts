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
import { personalize } from "./queue";
import type { Client } from "@/db/schema";

// Store active processor intervals
const activeProcessors = new Map<string, NodeJS.Timeout>();

// Constants - shorter delays for better UX
const MIN_DELAY_MS = 30 * 1000; // 30 seconds
const MAX_DELAY_MS = 60 * 1000; // 60 seconds
const PROCESSOR_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

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

  await db
    .update(campaigns)
    .set({ sentCount })
    .where(eq(campaigns.id, campaignId));

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
 * Process a single batch for a campaign
 */
async function processCampaignBatch(campaignId: string): Promise<void> {
  try {
    // Get campaign with template
    const campaignData = await db
      .select({
        campaign: campaigns,
        template: emailTemplates,
      })
      .from(campaigns)
      .leftJoin(emailTemplates, eq(campaigns.templateId, emailTemplates.id))
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (campaignData.length === 0) {
      console.log(`[Processor] Campaign ${campaignId} not found, stopping`);
      stopCampaignProcessor(campaignId);
      return;
    }

    const { campaign, template } = campaignData[0];

    // Check if campaign is still active
    if (campaign.status !== "active") {
      console.log(`[Processor] Campaign ${campaignId} is ${campaign.status}, stopping processor`);
      stopCampaignProcessor(campaignId);
      return;
    }

    // Check sending hours
    const startHour = campaign.sendStartHour || 9;
    const endHour = campaign.sendEndHour || 18;
    if (!isWithinSendingHours(startHour, endHour)) {
      const currentHour = new Date().getHours();
      await campaignLogger.info(
        campaignId,
        "waiting_for_send_window",
        `Waiting for send window (current: ${currentHour}:00, window: ${startHour}:00-${endHour}:00)`,
        { currentHour, sendWindow: `${startHour}:00-${endHour}:00` }
      );
      return;
    }

    // Check daily limit
    const dailySent = await getDailySentCount(campaignId);
    const dailyLimit = campaign.dailyLimit || 10;

    if (dailySent >= dailyLimit) {
      await campaignLogger.info(
        campaignId,
        "daily_limit_reached",
        `Daily limit reached (${dailySent}/${dailyLimit}). Will resume tomorrow.`,
        { sentToday: dailySent, dailyLimit }
      );
      return;
    }

    // Get one pending recipient
    const pendingRecipients = await getPendingRecipients(campaignId, 1);

    if (pendingRecipients.length === 0) {
      // Check if campaign should be marked as complete
      const isCompleted = await updateCampaignStats(campaignId);
      if (isCompleted) {
        await campaignLogger.success(
          campaignId,
          "campaign_completed",
          "Campaign completed! All emails have been sent."
        );
        stopCampaignProcessor(campaignId);
      }
      return;
    }

    const { recipientId, client } = pendingRecipients[0];

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
        campaignId,
        "recipient_skipped",
        `Skipped: No email address for "${client.companyName || "Unknown"}"`,
        { recipientCompany: client.companyName || "Unknown" }
      );
      return;
    }

    // Check if Resend is configured
    if (!isResendConfigured()) {
      await campaignLogger.error(
        campaignId,
        "resend_not_configured",
        "Resend API key not configured. Please set RESEND_API_KEY environment variable."
      );
      return;
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
      campaignId,
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
        campaignId,
        "email_sent",
        `Email sent successfully to ${client.email}`,
        { recipientEmail: client.email, recipientCompany: client.companyName || "Unknown", messageId: sendResult.messageId }
      );

      // Update stats
      await updateCampaignStats(campaignId);

      // Add random delay before next email
      const delay = randomDelay(MIN_DELAY_MS, MAX_DELAY_MS);
      const nextSendTime = new Date(Date.now() + delay);
      await campaignLogger.info(
        campaignId,
        "next_email_scheduled",
        `Next email scheduled in ${Math.round(delay / 1000)} seconds (~${nextSendTime.toLocaleTimeString()})`,
        { delaySeconds: Math.round(delay / 1000) }
      );
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
        campaignId,
        "email_failed",
        `Failed to send email to ${client.email}: ${sendResult.error}`,
        { recipientEmail: client.email, recipientCompany: client.companyName || "Unknown", errorMessage: sendResult.error }
      );
    }
  } catch (error) {
    console.error(`[Processor] Error processing campaign ${campaignId}:`, error);
    await campaignLogger.error(
      campaignId,
      "processor_error",
      `Error during processing: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Start background processor for a campaign
 */
export function startCampaignProcessor(campaignId: string): void {
  // Stop existing processor if any
  if (activeProcessors.has(campaignId)) {
    console.log(`[Processor] Stopping existing processor for campaign ${campaignId}`);
    stopCampaignProcessor(campaignId);
  }

  console.log(`[Processor] Starting processor for campaign ${campaignId}`);

  // Process immediately, then set interval
  processCampaignBatch(campaignId);

  const interval = setInterval(() => {
    processCampaignBatch(campaignId);
  }, PROCESSOR_INTERVAL_MS);

  activeProcessors.set(campaignId, interval);
}

/**
 * Stop processor for a campaign
 */
export function stopCampaignProcessor(campaignId: string): void {
  const interval = activeProcessors.get(campaignId);
  if (interval) {
    console.log(`[Processor] Stopping processor for campaign ${campaignId}`);
    clearInterval(interval);
    activeProcessors.delete(campaignId);
  }
}

/**
 * Check if processor is running for a campaign
 */
export function isProcessorRunning(campaignId: string): boolean {
  return activeProcessors.has(campaignId);
}

/**
 * Get all active processor campaign IDs
 */
export function getActiveProcessors(): string[] {
  return Array.from(activeProcessors.keys());
}
