import { Resend } from "resend";
import { appendToSent } from "./imap";

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
  saveToImap?: boolean; // Save a copy to IMAP Sent folder for threading
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Encode string to base64 (UTF-8 safe)
 */
function encodeBase64(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64");
}

/**
 * Encode subject for email header (RFC 2047)
 */
function encodeSubject(subject: string): string {
  // Check if subject has non-ASCII characters
  if (/[^\x00-\x7F]/.test(subject)) {
    return `=?UTF-8?B?${encodeBase64(subject)}?=`;
  }
  return subject;
}

/**
 * Build raw email string for IMAP append
 */
function buildRawEmailForImap(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  messageId: string;
}): string {
  const date = new Date().toUTCString();
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  let raw = "";
  raw += `From: ${params.from}\r\n`;
  raw += `To: ${params.to}\r\n`;
  raw += `Subject: ${encodeSubject(params.subject)}\r\n`;
  raw += `Date: ${date}\r\n`;
  raw += `Message-ID: <${params.messageId}@resend.dev>\r\n`;
  if (params.replyTo) {
    raw += `Reply-To: ${params.replyTo}\r\n`;
  }
  raw += `MIME-Version: 1.0\r\n`;

  // Multipart for HTML and text
  if (params.text) {
    raw += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
    raw += `\r\n`;
    raw += `--${boundary}\r\n`;
    raw += `Content-Type: text/plain; charset=utf-8\r\n`;
    raw += `Content-Transfer-Encoding: base64\r\n`;
    raw += `\r\n`;
    raw += encodeBase64(params.text) + "\r\n";
    raw += `--${boundary}\r\n`;
    raw += `Content-Type: text/html; charset=utf-8\r\n`;
    raw += `Content-Transfer-Encoding: base64\r\n`;
    raw += `\r\n`;
    raw += encodeBase64(params.html) + "\r\n";
    raw += `--${boundary}--\r\n`;
  } else {
    raw += `Content-Type: text/html; charset=utf-8\r\n`;
    raw += `Content-Transfer-Encoding: base64\r\n`;
    raw += `\r\n`;
    raw += encodeBase64(params.html) + "\r\n";
  }

  return raw;
}

/**
 * Send an email using Resend API
 * If saveToImap is true, also saves a copy to IMAP Sent folder for threading
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@example.com";
  const fromName = process.env.RESEND_FROM_NAME || "Email Campaign";

  // Use IMAP email as reply-to so replies come to cPanel inbox
  const imapEmail = process.env.IMAP_USER;
  const replyToAddress = params.replyTo || imapEmail;

  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: replyToAddress,
    });

    if (error) {
      console.error("Resend API error:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    const messageId = data?.id;

    // Save to IMAP Sent folder for threading if enabled and IMAP is configured
    if (params.saveToImap && messageId && imapEmail) {
      try {
        const rawEmail = buildRawEmailForImap({
          from: `${fromName} <${fromEmail}>`,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          replyTo: replyToAddress,
          messageId,
        });
        await appendToSent(rawEmail);
        console.log(`[Resend] Email saved to IMAP Sent folder: ${messageId}`);
      } catch (imapError) {
        // Log but don't fail - email was already sent successfully via Resend
        console.error("[Resend] Failed to save to IMAP Sent:", imapError);
      }
    }

    return {
      success: true,
      messageId,
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
