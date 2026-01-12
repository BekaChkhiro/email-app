import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchMessages } from "@/lib/imap";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get("q");
    const folder = request.nextUrl.searchParams.get("folder") || "INBOX";

    if (!query || query.length < 2) {
      return NextResponse.json({ messages: [] });
    }

    const messages = await searchMessages(folder, query);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error searching messages:", error);
    return NextResponse.json(
      { error: "Failed to search messages" },
      { status: 500 }
    );
  }
}
