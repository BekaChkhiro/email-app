import { NextResponse } from "next/server";
import { getQueueStatus } from "@/lib/queue";

/**
 * GET /api/queue/status
 * Get current queue status for dashboard
 */
export async function GET() {
  try {
    const status = await getQueueStatus();

    return NextResponse.json({
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching queue status:", error);
    return NextResponse.json(
      { error: "Failed to fetch queue status" },
      { status: 500 }
    );
  }
}
