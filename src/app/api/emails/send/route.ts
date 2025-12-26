import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients, emailHistory } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/resend";
import { personalize } from "@/lib/queue";

interface SendEmailRequest {
  clientId: string;
  subject: string;
  htmlContent: string;
  templateId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json();
    const { clientId, subject, htmlContent, templateId } = body;

    // Validate required fields
    if (!clientId || !subject || !htmlContent) {
      return NextResponse.json(
        { error: "clientId, subject, and htmlContent are required" },
        { status: 400 }
      );
    }

    // Get client
    const clientResult = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    const client = clientResult[0];

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    if (!client.email) {
      return NextResponse.json(
        { error: "Client does not have an email address" },
        { status: 400 }
      );
    }

    // Personalize content with client data
    const personalizedSubject = personalize(subject, client);
    const personalizedHtml = personalize(htmlContent, client);

    // Send email
    const result = await sendEmail({
      to: client.email,
      subject: personalizedSubject,
      html: personalizedHtml,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    // Save to email history
    await db.insert(emailHistory).values({
      clientId: client.id,
      campaignId: null,
      templateId: templateId || null,
      subject: personalizedSubject,
      contentPreview: personalizedHtml.substring(0, 200),
      resendMessageId: result.messageId,
      status: "sent",
      sentAt: new Date(),
    });

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
