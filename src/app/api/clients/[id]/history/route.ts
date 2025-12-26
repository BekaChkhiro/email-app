import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailHistory, campaigns, emailTemplates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const history = await db
      .select({
        id: emailHistory.id,
        subject: emailHistory.subject,
        contentPreview: emailHistory.contentPreview,
        status: emailHistory.status,
        sentAt: emailHistory.sentAt,
        openedAt: emailHistory.openedAt,
        clickedAt: emailHistory.clickedAt,
        resendMessageId: emailHistory.resendMessageId,
        campaignId: emailHistory.campaignId,
        campaignName: campaigns.name,
        templateName: emailTemplates.name,
      })
      .from(emailHistory)
      .leftJoin(campaigns, eq(emailHistory.campaignId, campaigns.id))
      .leftJoin(emailTemplates, eq(emailHistory.templateId, emailTemplates.id))
      .where(eq(emailHistory.clientId, id))
      .orderBy(desc(emailHistory.sentAt));

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching email history:", error);
    return NextResponse.json(
      { error: "Failed to fetch email history" },
      { status: 500 }
    );
  }
}
