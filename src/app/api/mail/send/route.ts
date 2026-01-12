import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/php-mail-api";
import { db } from "@/db";
import { emailDrafts, emailDraftAttachments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[MAIL SEND] ${msg}`);
    logs.push(`${new Date().toISOString()} - ${msg}`);
  };

  try {
    log("Starting email send process...");

    const session = await auth();
    if (!session?.user) {
      log("ERROR: Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized", logs }, { status: 401 });
    }
    log(`Authenticated as: ${session.user.email}`);

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
    } = body;

    log(`To: ${to}`);
    log(`Subject: ${subject}`);
    log(`Has HTML: ${!!html}`);
    log(`Has attachments: ${attachments?.length || 0}`);

    if (!to) {
      log("ERROR: No recipient");
      return NextResponse.json(
        { error: "Recipient (to) is required", logs },
        { status: 400 }
      );
    }

    if (!subject) {
      log("ERROR: No subject");
      return NextResponse.json(
        { error: "Subject is required", logs },
        { status: 400 }
      );
    }

    log("Calling PHP Mail API...");

    const result = await sendEmail({
      to: Array.isArray(to) ? to.join(", ") : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(", ") : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(", ") : bcc) : undefined,
      subject,
      html,
      text,
      replyTo,
      attachments,
    });

    log(`SUCCESS: Email sent, messageId: ${result.messageId}`);

    // Delete draft if sending from draft
    if (draftId) {
      try {
        log(`Deleting draft: ${draftId}`);
        await db
          .delete(emailDraftAttachments)
          .where(eq(emailDraftAttachments.draftId, draftId));
        await db.delete(emailDrafts).where(eq(emailDrafts.id, draftId));
        log("Draft deleted");
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        log(`WARNING: Failed to delete draft - ${errMsg}`);
      }
    }

    log("Email send complete!");
    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      logs,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`ERROR: ${errMsg}`);
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: errMsg, logs },
      { status: 500 }
    );
  }
}
