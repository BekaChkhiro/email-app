import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns, campaignRecipients, emailTemplates } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        templateId: campaigns.templateId,
        templateName: emailTemplates.name,
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
      .orderBy(desc(campaigns.createdAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      templateId,
      dailyLimit = 10,
      sendStartHour = 9,
      sendEndHour = 18,
      recipientIds = [],
      status = "draft",
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Campaign name is required" },
        { status: 400 }
      );
    }

    // Create campaign
    const created = await db
      .insert(campaigns)
      .values({
        name,
        templateId: templateId || null,
        dailyLimit,
        sendStartHour,
        sendEndHour,
        status,
        totalRecipients: recipientIds.length,
        sentCount: 0,
      })
      .returning();

    const campaign = created[0];

    // Add recipients if provided
    if (recipientIds.length > 0) {
      const recipientValues = recipientIds.map((clientId: string) => ({
        campaignId: campaign.id,
        clientId,
        status: "pending",
      }));

      await db.insert(campaignRecipients).values(recipientValues);
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
