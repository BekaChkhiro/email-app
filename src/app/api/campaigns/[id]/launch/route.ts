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

    // Get campaign
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, id),
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (!campaign.templateId) {
      return NextResponse.json(
        { error: "Campaign must have a template assigned" },
        { status: 400 }
      );
    }

    if (campaign.totalRecipients === 0) {
      return NextResponse.json(
        { error: "Campaign must have at least one recipient" },
        { status: 400 }
      );
    }

    if (campaign.status === "active") {
      return NextResponse.json(
        { error: "Campaign is already active" },
        { status: 400 }
      );
    }

    // Launch campaign
    const updated = await db
      .update(campaigns)
      .set({
        status: "active",
        startedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Campaign launched successfully",
      campaign: updated[0],
    });
  } catch (error) {
    console.error("Error launching campaign:", error);
    return NextResponse.json(
      { error: "Failed to launch campaign" },
      { status: 500 }
    );
  }
}
