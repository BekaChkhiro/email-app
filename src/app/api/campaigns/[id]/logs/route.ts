import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaignLogs } from "@/db/schema";
import { eq, desc, gt } from "drizzle-orm";

/**
 * GET /api/campaigns/[id]/logs
 * Get campaign execution logs for real-time console view
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const after = searchParams.get("after"); // ISO timestamp for incremental loading

    // Build query
    let query = db
      .select({
        id: campaignLogs.id,
        level: campaignLogs.level,
        event: campaignLogs.event,
        message: campaignLogs.message,
        metadata: campaignLogs.metadata,
        createdAt: campaignLogs.createdAt,
      })
      .from(campaignLogs)
      .where(eq(campaignLogs.campaignId, id))
      .orderBy(desc(campaignLogs.createdAt))
      .limit(limit);

    // If "after" timestamp is provided, only get logs newer than that
    if (after) {
      const afterDate = new Date(after);
      query = db
        .select({
          id: campaignLogs.id,
          level: campaignLogs.level,
          event: campaignLogs.event,
          message: campaignLogs.message,
          metadata: campaignLogs.metadata,
          createdAt: campaignLogs.createdAt,
        })
        .from(campaignLogs)
        .where(
          eq(campaignLogs.campaignId, id)
        )
        .orderBy(desc(campaignLogs.createdAt))
        .limit(limit);

      // Filter after query for new logs only
      const logs = await query;
      const filteredLogs = logs.filter(log => new Date(log.createdAt) > afterDate);

      return NextResponse.json({
        logs: filteredLogs.reverse(), // Return in chronological order
        hasMore: filteredLogs.length >= limit,
      });
    }

    const logs = await query;

    // Parse metadata JSON for each log
    const parsedLogs = logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));

    return NextResponse.json({
      logs: parsedLogs.reverse(), // Return in chronological order (oldest first)
      hasMore: logs.length >= limit,
    });
  } catch (error) {
    console.error("Error fetching campaign logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
