import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stopCampaignProcessor } from "@/lib/campaign-processor";
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

    if (campaign.status === "completed") {
      return NextResponse.json(
        { error: "Cannot stop a completed campaign" },
        { status: 400 }
      );
    }

    if (campaign.status === "stopped") {
      return NextResponse.json(
        { error: "Campaign is already stopped" },
        { status: 400 }
      );
    }

    // Stop the background processor
    stopCampaignProcessor(id);

    const updated = await db
      .update(campaigns)
      .set({
        status: "stopped",
        completedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();

    await campaignLogger.warning(
      id,
      "campaign_stopped",
      "Campaign has been stopped permanently"
    );

    return NextResponse.json({
      success: true,
      message: "Campaign stopped",
      campaign: updated[0],
    });
  } catch (error) {
    console.error("Error stopping campaign:", error);
    return NextResponse.json(
      { error: "Failed to stop campaign" },
      { status: 500 }
    );
  }
}
