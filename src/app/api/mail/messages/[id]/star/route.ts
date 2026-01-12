import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toggleStar } from "@/lib/imap";

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
    const { folder = "INBOX", starred } = body;
    const uid = parseInt(id);

    if (isNaN(uid)) {
      return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
    }

    if (typeof starred !== "boolean") {
      return NextResponse.json(
        { error: "starred must be a boolean" },
        { status: 400 }
      );
    }

    await toggleStar(folder, uid, starred);

    return NextResponse.json({ success: true, starred });
  } catch (error) {
    console.error("Error toggling star:", error);
    return NextResponse.json(
      { error: "Failed to toggle star" },
      { status: 500 }
    );
  }
}
