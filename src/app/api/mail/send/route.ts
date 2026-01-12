import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/smtp";
import { appendToSent } from "@/lib/imap";
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

    // Check SMTP configuration
    log(`SMTP_HOST: ${process.env.SMTP_HOST ? "SET" : "NOT SET"}`);
    log(`SMTP_USER: ${process.env.SMTP_USER ? "SET" : "NOT SET"}`);
    log(`SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? "SET" : "NOT SET"}`);
    log(`SMTP_PORT: ${process.env.SMTP_PORT || "465 (default)"}`);

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
      inReplyTo,
      references,
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

    log("Calling sendMail...");
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
      log(`ERROR: sendMail failed - ${result.error}`);
      return NextResponse.json({ error: result.error, logs }, { status: 500 });
    }

    log(`SUCCESS: Email sent, messageId: ${result.messageId}`);

    // Save to Sent folder
    if (result.rawEmail) {
      try {
        log("Saving to IMAP Sent folder...");
        await appendToSent(result.rawEmail);
        log("Saved to Sent folder");
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        log(`WARNING: Failed to save to Sent folder - ${errMsg}`);
        // Don't fail if saving to Sent fails
      }
    }

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
    const errStack = error instanceof Error ? error.stack : "";
    log(`FATAL ERROR: ${errMsg}`);
    log(`Stack: ${errStack}`);
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: `Failed to send email: ${errMsg}`, logs },
      { status: 500 }
    );
  }
}
