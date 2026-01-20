import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailHistory, clients, campaigns } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/campaigns/[id]/emails?status=delivered
 * Get emails for a campaign filtered by status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    // Validate status parameter
    const validStatuses = ["delivered", "opened", "clicked", "bounced", "complained", "sent"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Valid status parameter is required (delivered, opened, clicked, bounced, complained)" },
        { status: 400 }
      );
    }

    // Check if campaign exists
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, id),
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailHistory)
      .where(and(eq(emailHistory.campaignId, id), eq(emailHistory.status, status)));

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Get emails with client info
    const emails = await db
      .select({
        id: emailHistory.id,
        companyName: clients.companyName,
        email: clients.email,
        subject: emailHistory.subject,
        status: emailHistory.status,
        sentAt: emailHistory.sentAt,
        openedAt: emailHistory.openedAt,
        clickedAt: emailHistory.clickedAt,
        clientId: emailHistory.clientId,
      })
      .from(emailHistory)
      .leftJoin(clients, eq(emailHistory.clientId, clients.id))
      .where(and(eq(emailHistory.campaignId, id), eq(emailHistory.status, status)))
      .orderBy(sql`${emailHistory.sentAt} DESC`)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      emails,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching campaign emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign emails" },
      { status: 500 }
    );
  }
}
