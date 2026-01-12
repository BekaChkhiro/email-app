import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMessage, deleteMessage } from "@/lib/php-mail-api";

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

    const message = await getMessage(folder, uid);

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // PHP API automatically marks as read when fetching

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error fetching message:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch message";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
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

    await deleteMessage(folder, uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    const msg = error instanceof Error ? error.message : "Failed to delete message";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
