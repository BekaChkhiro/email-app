import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getThread, getMessage } from "@/lib/imap";

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

    // First get the message to find its Message-ID
    const message = await getMessage(folder, uid);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // If message has no Message-ID, return just this message
    if (!message.messageId) {
      return NextResponse.json({ thread: [message] });
    }

    // Get the full thread
    const thread = await getThread(folder, message.messageId);

    // If no thread found, return just the original message
    if (thread.length === 0) {
      return NextResponse.json({ thread: [message] });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("Error fetching thread:", error);
    return NextResponse.json(
      { error: "Failed to fetch thread" },
      { status: 500 }
    );
  }
}
