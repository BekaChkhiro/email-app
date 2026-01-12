import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { emailDrafts, emailDraftAttachments } from "@/db/schema";
import { eq } from "drizzle-orm";

// PHP API configuration
const PHP_API_URL = process.env.PHP_MAIL_API_URL; // e.g., https://yourdomain.com/api/send-mail.php
const PHP_API_KEY = process.env.PHP_MAIL_API_KEY;

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[MAIL SEND] ${msg}`);
    logs.push(`${new Date().toISOString()} - ${msg}`);
  };

  try {
    log("Starting email send process...");

    // Check PHP API configuration
    log(`PHP_MAIL_API_URL: ${PHP_API_URL ? "SET" : "NOT SET"}`);
    log(`PHP_MAIL_API_KEY: ${PHP_API_KEY ? "SET" : "NOT SET"}`);

    if (!PHP_API_URL || !PHP_API_KEY) {
      log("ERROR: PHP Mail API not configured");
      return NextResponse.json(
        { error: "PHP Mail API not configured. Set PHP_MAIL_API_URL and PHP_MAIL_API_KEY in .env", logs },
        { status: 500 }
      );
    }

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

    // Prepare request body for PHP API
    const phpRequestBody = {
      to: Array.isArray(to) ? to.join(", ") : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(", ") : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(", ") : bcc) : undefined,
      subject,
      html,
      text,
      replyTo,
      attachments,
    };

    log("Calling PHP Mail API...");
    log(`URL: ${PHP_API_URL}`);

    const phpResponse = await fetch(PHP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": PHP_API_KEY,
      },
      body: JSON.stringify(phpRequestBody),
    });

    log(`PHP API Response status: ${phpResponse.status}`);

    const phpResult = await phpResponse.json();
    log(`PHP API Response: ${JSON.stringify(phpResult)}`);

    if (!phpResponse.ok || !phpResult.success) {
      log(`ERROR: PHP API failed - ${phpResult.error}`);
      return NextResponse.json(
        { error: phpResult.error || "Failed to send email via PHP API", logs },
        { status: 500 }
      );
    }

    log(`SUCCESS: Email sent via PHP API, messageId: ${phpResult.messageId}`);
    log(`Method used: ${phpResult.method}`);

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
      messageId: phpResult.messageId,
      method: phpResult.method,
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
