import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Health check endpoint for Railway
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}
