import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/smtp";
import { appendToSent } from "@/lib/imap";
import { db } from "@/db";
import { emailDrafts, emailDraftAttachments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments,
      draftId,
      replyTo,
      inReplyTo,
      references,
    } = body;

    if (!to) {
      return NextResponse.json(
        { error: "Recipient (to) is required" },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    const result = await sendMail({
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments,
      replyTo,
      inReplyTo,
      references,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Save to Sent folder
    if (result.rawEmail) {
      try {
        await appendToSent(result.rawEmail);
      } catch (e) {
        console.error("Error saving to Sent folder:", e);
        // Don't fail if saving to Sent fails
      }
    }

    // Delete draft if sending from draft
    if (draftId) {
      try {
        await db
          .delete(emailDraftAttachments)
          .where(eq(emailDraftAttachments.draftId, draftId));
        await db.delete(emailDrafts).where(eq(emailDrafts.id, draftId));
      } catch (e) {
        console.error("Error deleting draft:", e);
        // Don't fail the send if draft deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
