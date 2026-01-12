import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMessage } from "@/lib/php-mail-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const folder = request.nextUrl.searchParams.get("folder") || "INBOX";
    const uid = parseInt(id);

    if (isNaN(uid)) {
      return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
    }

    // Get the message
    const message = await getMessage(folder, uid);

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // For now, return just the single message as thread
    // Full threading can be implemented later in PHP API
    return NextResponse.json({ thread: [message] });
  } catch (error) {
    console.error("Error fetching thread:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch thread";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
