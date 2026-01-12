import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markAsRead } from "@/lib/php-mail-api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { folder = "INBOX", read = true } = body;
    const uid = parseInt(id);

    if (isNaN(uid)) {
      return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
    }

    await markAsRead(folder, uid, read);

    return NextResponse.json({ success: true, read });
  } catch (error) {
    console.error("Error marking message:", error);
    const msg = error instanceof Error ? error.message : "Failed to mark message";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
