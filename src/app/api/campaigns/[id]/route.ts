import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns, campaignRecipients, clients, emailTemplates } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get campaign with template
    const campaign = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        templateId: campaigns.templateId,
        templateName: emailTemplates.name,
        templateSubject: emailTemplates.subject,
        status: campaigns.status,
        dailyLimit: campaigns.dailyLimit,
        sendStartHour: campaigns.sendStartHour,
        sendEndHour: campaigns.sendEndHour,
        totalRecipients: campaigns.totalRecipients,
        sentCount: campaigns.sentCount,
        createdAt: campaigns.createdAt,
        startedAt: campaigns.startedAt,
        completedAt: campaigns.completedAt,
      })
      .from(campaigns)
      .leftJoin(emailTemplates, eq(campaigns.templateId, emailTemplates.id))
      .where(eq(campaigns.id, id))
      .limit(1);

    if (campaign.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Get recipient stats
    const recipientStats = await db
      .select({
        status: campaignRecipients.status,
        count: sql<number>`count(*)::int`,
      })
      .from(campaignRecipients)
      .where(eq(campaignRecipients.campaignId, id))
      .groupBy(campaignRecipients.status);

    // Get sample recipients
    const sampleRecipients = await db
      .select({
        id: clients.id,
        companyName: clients.companyName,
        email: clients.email,
        status: campaignRecipients.status,
        sentAt: campaignRecipients.sentAt,
      })
      .from(campaignRecipients)
      .innerJoin(clients, eq(campaignRecipients.clientId, clients.id))
      .where(eq(campaignRecipients.campaignId, id))
      .limit(20);

    return NextResponse.json({
      ...campaign[0],
      recipientStats: recipientStats.reduce(
        (acc, curr) => ({ ...acc, [curr.status || "unknown"]: curr.count }),
        {}
      ),
      sampleRecipients,
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      id: _id,
      createdAt: _createdAt,
      recipientIds,
      ...updateData
    } = body;
    void _id;
    void _createdAt;

    // Update campaign
    const updated = await db
      .update(campaigns)
      .set(updateData)
      .where(eq(campaigns.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Update recipients if provided
    if (recipientIds && Array.isArray(recipientIds)) {
      // Remove existing recipients
      await db
        .delete(campaignRecipients)
        .where(eq(campaignRecipients.campaignId, id));

      // Add new recipients
      if (recipientIds.length > 0) {
        const recipientValues = recipientIds.map((clientId: string) => ({
          campaignId: id,
          clientId,
          status: "pending",
        }));

        await db.insert(campaignRecipients).values(recipientValues);
      }

      // Update total count
      await db
        .update(campaigns)
        .set({ totalRecipients: recipientIds.length })
        .where(eq(campaigns.id, id));
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Recipients will be deleted automatically due to cascade
    const deleted = await db
      .delete(campaigns)
      .where(eq(campaigns.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
