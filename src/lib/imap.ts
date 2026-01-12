import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { ParsedMail, AddressObject } from "mailparser";

// =====================
// TYPES
// =====================

export interface EmailAddress {
  name: string;
  address: string;
}

export interface EmailMessage {
  id: string;
  uid: number;
  messageId: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  date: Date;
  preview: string;
  hasAttachments: boolean;
  isRead: boolean;
  isStarred: boolean;
  flags: string[];
}

export interface EmailFull extends EmailMessage {
  html?: string;
  text?: string;
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  content?: Buffer;
}

export interface FolderInfo {
  name: string;
  path: string;
  total: number;
  unread: number;
  icon: string;
}

interface ImapConfig {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  secure: boolean;
}

// =====================
// IMAP CLIENT MANAGEMENT
// =====================

function getImapConfig(): ImapConfig {
  if (
    !process.env.IMAP_HOST ||
    !process.env.IMAP_USER ||
    !process.env.IMAP_PASSWORD
  ) {
    throw new Error(
      "IMAP configuration is missing. Please check your .env file."
    );
  }

  return {
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT || "993"),
    auth: {
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASSWORD,
    },
    secure: process.env.IMAP_TLS !== "false",
  };
}

async function createClient(): Promise<ImapFlow> {
  const config = getImapConfig();
  const client = new ImapFlow({
    ...config,
    logger: false,
  });

  await client.connect();
  return client;
}

// =====================
// FOLDER OPERATIONS
// =====================

export async function getFolders(): Promise<FolderInfo[]> {
  const client = await createClient();

  try {
    const mailboxes = await client.list();

    // Standard folders mapping
    const standardFolders = [
      { name: "Inbox", path: "INBOX", icon: "inbox" },
      { name: "Sent", path: "Sent", icon: "send" },
      { name: "Drafts", path: "Drafts", icon: "file-text" },
      { name: "Trash", path: "Trash", icon: "trash" },
    ];

    const result: FolderInfo[] = [];

    for (const sf of standardFolders) {
      // Find matching mailbox (case-insensitive)
      const found = mailboxes.find(
        (m) =>
          m.path.toLowerCase() === sf.path.toLowerCase() ||
          m.specialUse === `\\${sf.name}`
      );

      if (found) {
        try {
          const status = await client.status(found.path, {
            messages: true,
            unseen: true,
          });

          result.push({
            name: sf.name,
            path: found.path,
            icon: sf.icon,
            total: status.messages || 0,
            unread: status.unseen || 0,
          });
        } catch {
          // Folder exists but can't get status
          result.push({
            name: sf.name,
            path: found.path,
            icon: sf.icon,
            total: 0,
            unread: 0,
          });
        }
      } else {
        // Folder doesn't exist, add with zero counts
        result.push({
          name: sf.name,
          path: sf.path,
          icon: sf.icon,
          total: 0,
          unread: 0,
        });
      }
    }

    return result;
  } finally {
    await client.logout();
  }
}

// =====================
// MESSAGE LIST OPERATIONS
// =====================

export async function getMessages(
  folder: string,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: EmailMessage[]; total: number }> {
  const client = await createClient();

  try {
    let lock;
    try {
      lock = await client.getMailboxLock(folder);
    } catch {
      // Folder doesn't exist or can't be opened
      return { messages: [], total: 0 };
    }

    try {
      const mailbox = client.mailbox;
      const total =
        mailbox && typeof mailbox === "object" && "exists" in mailbox
          ? (mailbox.exists as number)
          : 0;

      if (total === 0) {
        return { messages: [], total: 0 };
      }

      const messages: EmailMessage[] = [];

      // Calculate range (newest first)
      const end = total - (page - 1) * limit;
      const start = Math.max(1, end - limit + 1);

      if (end < 1) {
        return { messages: [], total };
      }

      const range = `${start}:${end}`;

      for await (const msg of client.fetch(range, {
        envelope: true,
        flags: true,
        bodyStructure: true,
        uid: true,
      })) {
        const envelope = msg.envelope;
        const flags = msg.flags || new Set<string>();

        if (!envelope) continue;

        messages.push({
          id: msg.uid.toString(),
          uid: msg.uid,
          messageId: envelope.messageId || "",
          subject: envelope.subject || "(No Subject)",
          from: {
            name: envelope.from?.[0]?.name || "",
            address: envelope.from?.[0]?.address || "",
          },
          to:
            envelope.to?.map((t: { name?: string; address?: string }) => ({
              name: t.name || "",
              address: t.address || "",
            })) || [],
          cc: envelope.cc?.map((t: { name?: string; address?: string }) => ({
            name: t.name || "",
            address: t.address || "",
          })),
          date: envelope.date || new Date(),
          preview: "",
          hasAttachments: hasAttachments(msg.bodyStructure),
          isRead: flags.has("\\Seen"),
          isStarred: flags.has("\\Flagged"),
          flags: Array.from(flags),
        });
      }

      // Return newest first
      return { messages: messages.reverse(), total };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

// =====================
// SINGLE MESSAGE OPERATIONS
// =====================

function extractAddresses(
  addr: AddressObject | AddressObject[] | undefined
): EmailAddress[] {
  if (!addr) return [];
  const addresses = Array.isArray(addr) ? addr : [addr];
  return addresses.flatMap(
    (a) =>
      a.value?.map((v) => ({
        name: v.name || "",
        address: v.address || "",
      })) || []
  );
}

export async function getMessage(
  folder: string,
  uid: number
): Promise<EmailFull | null> {
  const client = await createClient();

  try {
    const lock = await client.getMailboxLock(folder);

    try {
      const msg = await client.fetchOne(
        uid.toString(),
        {
          source: true,
          envelope: true,
          flags: true,
        },
        { uid: true }
      );

      if (!msg || !msg.source) return null;

      const flags = msg.flags || new Set<string>();
      const parsed: ParsedMail = await simpleParser(msg.source);

      const fromAddresses = extractAddresses(parsed.from);
      const toAddresses = extractAddresses(parsed.to);
      const ccAddresses = extractAddresses(parsed.cc);

      return {
        id: uid.toString(),
        uid,
        messageId: parsed.messageId || "",
        subject: parsed.subject || "(No Subject)",
        from: fromAddresses[0] || { name: "", address: "" },
        to: toAddresses,
        cc: ccAddresses.length > 0 ? ccAddresses : undefined,
        date: parsed.date || new Date(),
        preview: parsed.text?.substring(0, 200) || "",
        html: parsed.html || undefined,
        text: parsed.text || undefined,
        hasAttachments: (parsed.attachments?.length || 0) > 0,
        isRead: flags.has("\\Seen"),
        isStarred: flags.has("\\Flagged"),
        flags: Array.from(flags),
        attachments:
          parsed.attachments?.map((att) => ({
            filename: att.filename || "attachment",
            contentType: att.contentType,
            size: att.size,
            contentId: att.contentId,
            content: att.content,
          })) || [],
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export async function getAttachment(
  folder: string,
  uid: number,
  attachmentIndex: number
): Promise<EmailAttachment | null> {
  const email = await getMessage(folder, uid);
  if (!email || !email.attachments[attachmentIndex]) {
    return null;
  }
  return email.attachments[attachmentIndex];
}

// =====================
// FLAG OPERATIONS
// =====================

export async function markAsRead(
  folder: string,
  uid: number,
  read: boolean
): Promise<void> {
  const client = await createClient();

  try {
    const lock = await client.getMailboxLock(folder);

    try {
      if (read) {
        await client.messageFlagsAdd(uid.toString(), ["\\Seen"], { uid: true });
      } else {
        await client.messageFlagsRemove(uid.toString(), ["\\Seen"], {
          uid: true,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export async function toggleStar(
  folder: string,
  uid: number,
  starred: boolean
): Promise<void> {
  const client = await createClient();

  try {
    const lock = await client.getMailboxLock(folder);

    try {
      if (starred) {
        await client.messageFlagsAdd(uid.toString(), ["\\Flagged"], {
          uid: true,
        });
      } else {
        await client.messageFlagsRemove(uid.toString(), ["\\Flagged"], {
          uid: true,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

// =====================
// MESSAGE MOVE/DELETE
// =====================

export async function moveMessage(
  sourceFolder: string,
  uid: number,
  targetFolder: string
): Promise<void> {
  const client = await createClient();

  try {
    const lock = await client.getMailboxLock(sourceFolder);

    try {
      await client.messageMove(uid.toString(), targetFolder, { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export async function deleteMessage(
  folder: string,
  uid: number
): Promise<void> {
  const client = await createClient();

  try {
    const lock = await client.getMailboxLock(folder);

    try {
      await client.messageDelete(uid.toString(), { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

// =====================
// SEARCH
// =====================

export async function searchMessages(
  folder: string,
  query: string
): Promise<EmailMessage[]> {
  const client = await createClient();

  try {
    let lock;
    try {
      lock = await client.getMailboxLock(folder);
    } catch {
      return [];
    }

    try {
      const results: EmailMessage[] = [];

      // Search in subject, from, and body
      for await (const msg of client.fetch(
        { or: [{ subject: query }, { from: query }, { body: query }] },
        { envelope: true, flags: true, bodyStructure: true, uid: true }
      )) {
        const envelope = msg.envelope;
        const flags = msg.flags || new Set<string>();

        if (!envelope) continue;

        results.push({
          id: msg.uid.toString(),
          uid: msg.uid,
          messageId: envelope.messageId || "",
          subject: envelope.subject || "(No Subject)",
          from: {
            name: envelope.from?.[0]?.name || "",
            address: envelope.from?.[0]?.address || "",
          },
          to:
            envelope.to?.map((t: { name?: string; address?: string }) => ({
              name: t.name || "",
              address: t.address || "",
            })) || [],
          date: envelope.date || new Date(),
          preview: "",
          hasAttachments: hasAttachments(msg.bodyStructure),
          isRead: flags.has("\\Seen"),
          isStarred: flags.has("\\Flagged"),
          flags: Array.from(flags),
        });
      }

      return results;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

// =====================
// HELPERS
// =====================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasAttachments(bodyStructure: any): boolean {
  if (!bodyStructure) return false;
  if (bodyStructure.disposition === "attachment") return true;
  if (bodyStructure.childNodes) {
    return bodyStructure.childNodes.some(hasAttachments);
  }
  return false;
}

// =====================
// APPEND TO SENT
// =====================

export async function appendToSent(rawEmail: string): Promise<boolean> {
  const client = await createClient();

  try {
    // Find Sent folder
    const mailboxes = await client.list();
    const sentFolder = mailboxes.find(
      (m) =>
        m.path.toLowerCase() === "sent" ||
        m.specialUse === "\\Sent"
    );

    const sentPath = sentFolder?.path || "Sent";

    // Append the email to Sent folder
    await client.append(sentPath, rawEmail, ["\\Seen"]);

    return true;
  } catch (error) {
    console.error("Error appending to Sent:", error);
    return false;
  } finally {
    await client.logout();
  }
}

// =====================
// CONNECTION TEST
// =====================

export async function testConnection(): Promise<boolean> {
  try {
    const client = await createClient();
    await client.logout();
    return true;
  } catch {
    return false;
  }
}
