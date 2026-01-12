import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";

// =====================
// TYPES
// =====================

export interface SendMailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  rawEmail?: string;
}

// =====================
// SMTP TRANSPORTER
// =====================

function getSmtpConfig() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error("SMTP configuration is missing. Please check your .env file.");
  }

  return {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: process.env.SMTP_SECURE !== "false",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };
}

function createTransporter(): nodemailer.Transporter {
  const config = getSmtpConfig();
  return nodemailer.createTransport(config);
}

// =====================
// SEND EMAIL
// =====================

export async function sendMail(options: SendMailOptions): Promise<SendResult> {
  console.log("[SMTP] sendMail called");

  try {
    console.log("[SMTP] Getting SMTP config...");
    console.log(`[SMTP] SMTP_HOST: ${process.env.SMTP_HOST}`);
    console.log(`[SMTP] SMTP_PORT: ${process.env.SMTP_PORT || "465"}`);
    console.log(`[SMTP] SMTP_USER: ${process.env.SMTP_USER}`);
    console.log(`[SMTP] SMTP_SECURE: ${process.env.SMTP_SECURE !== "false"}`);

    const transport = createTransporter();
    console.log("[SMTP] Transporter created");

    const fromName = process.env.EMAIL_CLIENT_FROM_NAME || "Email Client";
    const fromEmail = process.env.SMTP_USER;

    const attachments: Attachment[] =
      options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })) || [];

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      cc: options.cc
        ? Array.isArray(options.cc)
          ? options.cc.join(", ")
          : options.cc
        : undefined,
      bcc: options.bcc
        ? Array.isArray(options.bcc)
          ? options.bcc.join(", ")
          : options.bcc
        : undefined,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments,
      replyTo: options.replyTo,
      inReplyTo: options.inReplyTo,
      references: options.references,
    };

    console.log(`[SMTP] Sending email from ${mailOptions.from} to ${mailOptions.to}`);
    console.log("[SMTP] Calling transport.sendMail...");

    const result = await transport.sendMail(mailOptions);

    console.log(`[SMTP] Email sent successfully! MessageId: ${result.messageId}`);

    // Build raw email for saving to Sent folder
    const rawEmail = await buildRawEmail(mailOptions);

    return {
      success: true,
      messageId: result.messageId,
      rawEmail,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = (error as NodeJS.ErrnoException)?.code;
    console.error(`[SMTP] ERROR: ${errMsg}`);
    console.error(`[SMTP] Error code: ${errCode}`);
    console.error("[SMTP] Full error:", error);
    return {
      success: false,
      error: `SMTP Error: ${errMsg}${errCode ? ` (code: ${errCode})` : ""}`,
    };
  }
}

// Build raw email string for IMAP append
async function buildRawEmail(mailOptions: {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Attachment[];
}): Promise<string> {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const date = new Date().toUTCString();
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${process.env.SMTP_HOST}>`;

  let raw = "";
  raw += `From: ${mailOptions.from}\r\n`;
  raw += `To: ${mailOptions.to}\r\n`;
  if (mailOptions.cc) raw += `Cc: ${mailOptions.cc}\r\n`;
  raw += `Subject: ${mailOptions.subject}\r\n`;
  raw += `Date: ${date}\r\n`;
  raw += `Message-ID: ${messageId}\r\n`;
  raw += `MIME-Version: 1.0\r\n`;

  if (mailOptions.attachments && mailOptions.attachments.length > 0) {
    raw += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
    raw += `\r\n`;
    raw += `--${boundary}\r\n`;
  }

  if (mailOptions.html) {
    raw += `Content-Type: text/html; charset=utf-8\r\n`;
    raw += `Content-Transfer-Encoding: quoted-printable\r\n`;
    raw += `\r\n`;
    raw += mailOptions.html + "\r\n";
  } else if (mailOptions.text) {
    raw += `Content-Type: text/plain; charset=utf-8\r\n`;
    raw += `\r\n`;
    raw += mailOptions.text + "\r\n";
  }

  if (mailOptions.attachments && mailOptions.attachments.length > 0) {
    for (const att of mailOptions.attachments) {
      raw += `--${boundary}\r\n`;
      raw += `Content-Type: ${att.contentType || "application/octet-stream"}; name="${att.filename}"\r\n`;
      raw += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
      raw += `Content-Transfer-Encoding: base64\r\n`;
      raw += `\r\n`;
      const content = typeof att.content === "string"
        ? att.content
        : att.content
          ? Buffer.from(att.content as Buffer).toString("base64")
          : "";
      raw += content + "\r\n";
    }
    raw += `--${boundary}--\r\n`;
  }

  return raw;
}

// =====================
// CONNECTION TEST
// =====================

export async function verifyConnection(): Promise<boolean> {
  try {
    const transport = createTransporter();
    await transport.verify();
    return true;
  } catch {
    return false;
  }
}
