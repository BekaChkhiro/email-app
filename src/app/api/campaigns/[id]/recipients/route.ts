import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaignRecipients, clients } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const status = searchParams.get("status");
    const offset = (page - 1) * limit;

    // Build query
    let query = db
      .select({
        id: campaignRecipients.id,
        clientId: clients.id,
        companyName: clients.companyName,
        email: clients.email,
        city: clients.city,
        status: campaignRecipients.status,
        scheduledAt: campaignRecipients.scheduledAt,
        sentAt: campaignRecipients.sentAt,
        errorMessage: campaignRecipients.errorMessage,
      })
      .from(campaignRecipients)
      .innerJoin(clients, eq(campaignRecipients.clientId, clients.id))
      .where(eq(campaignRecipients.campaignId, id))
      .$dynamic();

    // Apply status filter
    if (status) {
      query = query.where(eq(campaignRecipients.status, status));
    }

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, id));

    const total = totalResult[0]?.count || 0;

    // Get paginated results
    const recipients = await query.limit(limit).offset(offset);

    return NextResponse.json({
      data: recipients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching recipients:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}
