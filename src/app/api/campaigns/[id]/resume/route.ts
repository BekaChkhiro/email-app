import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { startCampaignProcessor } from "@/lib/campaign-processor";
import { campaignLogger } from "@/lib/campaign-logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, id),
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.status !== "paused") {
      return NextResponse.json(
        { error: "Only paused campaigns can be resumed" },
        { status: 400 }
      );
    }

    const updated = await db
      .update(campaigns)
      .set({ status: "active" })
      .where(eq(campaigns.id, id))
      .returning();

    await campaignLogger.info(
      id,
      "campaign_resumed",
      "Campaign has been resumed"
    );

    // Start the background processor
    startCampaignProcessor(id);

    return NextResponse.json({
      success: true,
      message: "Campaign resumed",
      campaign: updated[0],
    });
  } catch (error) {
    console.error("Error resuming campaign:", error);
    return NextResponse.json(
      { error: "Failed to resume campaign" },
      { status: 500 }
    );
  }
}
