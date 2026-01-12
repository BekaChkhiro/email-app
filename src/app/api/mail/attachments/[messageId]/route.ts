import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAttachment } from "@/lib/php-mail-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = await params;
    const folder = request.nextUrl.searchParams.get("folder") || "INBOX";
    const partId = request.nextUrl.searchParams.get("partId") || "2";

    const uid = parseInt(messageId);

    if (isNaN(uid)) {
      return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
    }

    const attachment = await getAttachment(folder, uid, partId);

    // Return the file as a download
    return new NextResponse(attachment.content, {
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
        "Content-Length": attachment.content.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching attachment:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch attachment";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
