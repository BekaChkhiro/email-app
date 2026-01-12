import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { moveMessage } from "@/lib/imap";

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
    const { folder = "INBOX", targetFolder } = body;
    const uid = parseInt(id);

    if (isNaN(uid)) {
      return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
    }

    if (!targetFolder) {
      return NextResponse.json(
        { error: "targetFolder is required" },
        { status: 400 }
      );
    }

    await moveMessage(folder, uid, targetFolder);

    return NextResponse.json({ success: true, targetFolder });
  } catch (error) {
    console.error("Error moving message:", error);
    return NextResponse.json(
      { error: "Failed to move message" },
      { status: 500 }
    );
  }
}
