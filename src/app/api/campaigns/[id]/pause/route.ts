import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    if (campaign.status !== "active") {
      return NextResponse.json(
        { error: "Only active campaigns can be paused" },
        { status: 400 }
      );
    }

    const updated = await db
      .update(campaigns)
      .set({ status: "paused" })
      .where(eq(campaigns.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Campaign paused",
      campaign: updated[0],
    });
  } catch (error) {
    console.error("Error pausing campaign:", error);
    return NextResponse.json(
      { error: "Failed to pause campaign" },
      { status: 500 }
    );
  }
}
