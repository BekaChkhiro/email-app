import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailHistory } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Resend Webhook Events
 * https://resend.com/docs/dashboard/webhooks/introduction
 */
interface ResendWebhookEvent {
  type:
    | "email.sent"
    | "email.delivered"
    | "email.delivery_delayed"
    | "email.complained"
    | "email.bounced"
    | "email.opened"
    | "email.clicked";
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };
}

/**
 * POST /api/webhooks/resend
 * Handle Resend webhook events for email tracking
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (optional but recommended)
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("svix-signature");
      // In production, you should verify the signature
      // using the Resend webhook verification library
      if (!signature) {
        console.warn("Webhook received without signature");
      }
    }

    const event: ResendWebhookEvent = await request.json();
    const messageId = event.data.email_id;

    console.log(`Resend webhook: ${event.type} for ${messageId}`);

    // Find the email history record by Resend message ID
    const existing = await db.query.emailHistory.findFirst({
      where: eq(emailHistory.resendMessageId, messageId),
    });

    if (!existing) {
      // Email not tracked by us, ignore
      return NextResponse.json({ received: true });
    }

    // Update based on event type
    switch (event.type) {
      case "email.delivered":
        await db
          .update(emailHistory)
          .set({ status: "delivered" })
          .where(eq(emailHistory.resendMessageId, messageId));
        break;

      case "email.opened":
        await db
          .update(emailHistory)
          .set({
            status: "opened",
            openedAt: new Date(event.created_at),
          })
          .where(eq(emailHistory.resendMessageId, messageId));
        break;

      case "email.clicked":
        await db
          .update(emailHistory)
          .set({
            status: "clicked",
            clickedAt: new Date(event.created_at),
          })
          .where(eq(emailHistory.resendMessageId, messageId));
        break;

      case "email.bounced":
        await db
          .update(emailHistory)
          .set({ status: "bounced" })
          .where(eq(emailHistory.resendMessageId, messageId));
        break;

      case "email.complained":
        await db
          .update(emailHistory)
          .set({ status: "complained" })
          .where(eq(emailHistory.resendMessageId, messageId));
        break;

      case "email.delivery_delayed":
        // Keep as sent, just log
        console.log(`Email ${messageId} delivery delayed`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
