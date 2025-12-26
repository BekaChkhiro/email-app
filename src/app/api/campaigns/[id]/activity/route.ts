import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailHistory, clients, campaignRecipients } from "@/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

/**
 * GET /api/campaigns/[id]/activity
 * Get recent email activity for a campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // Get recent activity
    const activity = await db
      .select({
        id: emailHistory.id,
        clientId: emailHistory.clientId,
        companyName: clients.companyName,
        email: clients.email,
        subject: emailHistory.subject,
        status: emailHistory.status,
        sentAt: emailHistory.sentAt,
        openedAt: emailHistory.openedAt,
        clickedAt: emailHistory.clickedAt,
      })
      .from(emailHistory)
      .innerJoin(clients, eq(emailHistory.clientId, clients.id))
      .where(eq(emailHistory.campaignId, id))
      .orderBy(desc(emailHistory.sentAt))
      .limit(limit);

    // Get today's sent count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaignRecipients)
      .where(
        and(
          eq(campaignRecipients.campaignId, id),
          eq(campaignRecipients.status, "sent"),
          gte(campaignRecipients.sentAt, today)
        )
      );

    return NextResponse.json({
      activity,
      todaySentCount: todayResult[0]?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching campaign activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
