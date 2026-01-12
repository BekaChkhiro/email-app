import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMessages } from "@/lib/php-mail-api";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const folder = searchParams.get("folder") || "INBOX";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const { messages, pagination } = await getMessages(folder, page, limit);

    return NextResponse.json({
      messages,
      pagination,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
