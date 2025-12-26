import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, isResendConfigured } from "@/lib/resend";

const SAMPLE_DATA = {
  company_name: "Sample Company",
  email: "test@example.com",
  city: "Tbilisi",
  category: "Technology",
  website: "https://example.com",
  phone: "+995 555 123456",
};

function personalizeForTest(content: string): string {
  return content
    .replace(/\{\{company_name\}\}/g, SAMPLE_DATA.company_name)
    .replace(/\{\{email\}\}/g, SAMPLE_DATA.email)
    .replace(/\{\{city\}\}/g, SAMPLE_DATA.city)
    .replace(/\{\{category\}\}/g, SAMPLE_DATA.category)
    .replace(/\{\{website\}\}/g, SAMPLE_DATA.website)
    .replace(/\{\{phone\}\}/g, SAMPLE_DATA.phone);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    if (!isResendConfigured()) {
      return NextResponse.json(
        { error: "Email service is not configured. Please add RESEND_API_KEY to your environment." },
        { status: 503 }
      );
    }

    const template = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, id),
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const subject = personalizeForTest(template.subject);
    const htmlContent = personalizeForTest(template.htmlContent);

    const result = await sendEmail({
      to: email,
      subject: `[TEST] ${subject}`,
      html: htmlContent,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send test email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}
