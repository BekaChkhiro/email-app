import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAttachment } from "@/lib/imap";

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
    const indexStr = request.nextUrl.searchParams.get("index");

    const uid = parseInt(messageId);
    const index = indexStr ? parseInt(indexStr) : 0;

    if (isNaN(uid)) {
      return NextResponse.json({ error: "Invalid message ID" }, { status: 400 });
    }

    const attachment = await getAttachment(folder, uid, index);

    if (!attachment || !attachment.content) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Return the file as a download
    const content = new Uint8Array(attachment.content);
    return new NextResponse(content, {
      headers: {
        "Content-Type": attachment.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
        "Content-Length": attachment.size.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching attachment:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachment" },
      { status: 500 }
    );
  }
}
