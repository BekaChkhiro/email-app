import { Resend } from "resend";

// Lazy-initialize Resend client to avoid build errors
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend API
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@example.com";
  const fromName = process.env.RESEND_FROM_NAME || "Email Campaign";

  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    });

    if (error) {
      console.error("Resend API error:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify Resend API key is configured
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
