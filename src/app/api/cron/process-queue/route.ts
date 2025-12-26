import { NextRequest, NextResponse } from "next/server";
import { processEmailQueue } from "@/lib/queue";

/**
 * GET /api/cron/process-queue
 * Called by Railway Cron or manually to process email queue
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow bypass for development or if no secret is set
  const isDev = process.env.NODE_ENV === "development";
  const secretMatch = authHeader === `Bearer ${cronSecret}`;

  if (!isDev && cronSecret && !secretMatch) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processEmailQueue();

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Queue processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/process-queue
 * Manual trigger for processing queue (same logic as GET)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
