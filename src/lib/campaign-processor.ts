import { db } from "@/db";
import {
  campaigns,
  campaignRecipients,
  clients,
  emailTemplates,
  emailHistory,
} from "@/db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { sendEmail, isResendConfigured } from "./resend";
import { campaignLogger } from "./campaign-logger";
import { personalize } from "./queue";
import type { Client } from "@/db/schema";

// Store active processor intervals
const activeProcessors = new Map<string, NodeJS.Timeout>();

// Check every minute for scheduled sends
const PROCESSOR_INTERVAL_MS = 60 * 1000; // Check every 60 seconds
const MIN_INTERVAL_MINUTES = 5; // Minimum 5 minutes between emails

/**
 * Get current hour in local timezone (Georgia/Tbilisi UTC+4)
 */
function getLocalHour(): number {
  const now = new Date();
  // Use Georgia timezone (UTC+4)
  const georgiaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tbilisi" }));
  return georgiaTime.getHours();
}

/**
 * Check if current time is within sending hours
 */
function isWithinSendingHours(startHour: number, endHour: number): boolean {
  const currentHour = getLocalHour();
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Get current time in Georgia timezone
 */
function getLocalTime(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tbilisi" }));
}

/**
 * Calculate interval between emails based on daily limit and send window
 * Returns interval in milliseconds
 */
function calculateEmailInterval(dailyLimit: number, startHour: number, endHour: number): number {
  const windowHours = endHour - startHour;
  const windowMinutes = windowHours * 60;

  // Calculate minutes between each email
  let intervalMinutes = windowMinutes / dailyLimit;

  // Ensure minimum interval
  if (intervalMinutes < MIN_INTERVAL_MINUTES) {
    intervalMinutes = MIN_INTERVAL_MINUTES;
  }

  // Add some randomization (±10%)
  const variance = intervalMinutes * 0.1;
  const randomOffset = (Math.random() * variance * 2) - variance;
  intervalMinutes += randomOffset;

  return Math.round(intervalMinutes * 60 * 1000); // Convert to milliseconds
}

/**
 * Get the last sent email time for a campaign today
 */
async function getLastSentTime(campaignId: string): Promise<Date | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select({ sentAt: campaignRecipients.sentAt })
    .from(campaignRecipients)
    .where(
      and(
        eq(campaignRecipients.campaignId, campaignId),
        eq(campaignRecipients.status, "sent"),
        gte(campaignRecipients.sentAt, today)
      )
    )
    .orderBy(desc(campaignRecipients.sentAt))
    .limit(1);

  return result[0]?.sentAt || null;
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
 * Format milliseconds to human readable time
 */
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) {
    return `${minutes} წუთში`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} საათში`;
  }
  return `${hours} სთ ${remainingMinutes} წთ-ში`;
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
    const currentHour = getLocalHour();
    if (!isWithinSendingHours(startHour, endHour)) {
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

    // Calculate interval based on daily limit and send window
    const emailInterval = calculateEmailInterval(dailyLimit, startHour, endHour);
    const intervalMinutes = Math.round(emailInterval / 60000);

    // Check if enough time has passed since last email
    const lastSentTime = await getLastSentTime(campaignId);
    if (lastSentTime) {
      const now = new Date();
      const timeSinceLastEmail = now.getTime() - lastSentTime.getTime();

      if (timeSinceLastEmail < emailInterval) {
        // Not time yet, wait silently
        return;
      }
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
        `Email sent successfully to ${client.email} (${dailySent + 1}/${dailyLimit} today)`,
        { recipientEmail: client.email, recipientCompany: client.companyName || "Unknown", messageId: sendResult.messageId }
      );

      // Update stats
      await updateCampaignStats(campaignId);

      // Log next email schedule
      const nextEmailTime = new Date(Date.now() + emailInterval);
      await campaignLogger.info(
        campaignId,
        "next_email_scheduled",
        `Next email in ~${formatDuration(emailInterval)} (${nextEmailTime.toLocaleTimeString("ka-GE", { timeZone: "Asia/Tbilisi" })})`,
        {
          intervalMinutes,
          schedule: `${dailyLimit} emails / ${endHour - startHour} hours`
        }
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
