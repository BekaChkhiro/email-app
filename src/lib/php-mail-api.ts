/**
 * PHP Mail API Client
 *
 * Helper functions for communicating with PHP Mail API on cPanel
 */

const PHP_API_URL = process.env.PHP_MAIL_API_URL;
const PHP_API_KEY = process.env.PHP_MAIL_API_KEY;

export class PhpMailApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "PhpMailApiError";
  }
}

/**
 * Check if PHP Mail API is configured
 */
export function isConfigured(): boolean {
  return !!(PHP_API_URL && PHP_API_KEY);
}

/**
 * Make a request to PHP Mail API
 */
async function makeRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
    query?: Record<string, string | number>;
  } = {}
): Promise<T> {
  if (!PHP_API_URL || !PHP_API_KEY) {
    throw new PhpMailApiError(
      "PHP Mail API not configured. Set PHP_MAIL_API_URL and PHP_MAIL_API_KEY",
      500
    );
  }

  const { method = "GET", body, query } = options;

  // Build URL with query params
  let url = `${PHP_API_URL}/${endpoint}`;
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      params.append(key, String(value));
    }
    url += `?${params.toString()}`;
  }

  console.log(`[PHP API] ${method} ${url}`);

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": PHP_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  console.log(`[PHP API] Response status: ${response.status}`);

  if (!response.ok || !data.success) {
    console.error(`[PHP API] Error: ${data.error}`);
    throw new PhpMailApiError(
      data.error || "PHP API request failed",
      response.status
    );
  }

  return data;
}

// =====================
// FOLDERS
// =====================

export interface Folder {
  name: string;
  path: string;
  total: number;
  unread: number;
}

export async function getFolders(): Promise<Folder[]> {
  const data = await makeRequest<{ folders: Folder[] }>("folders");
  return data.folders;
}

// =====================
// MESSAGES
// =====================

export interface EmailAddress {
  name: string;
  address: string;
}

export interface MessageSummary {
  id: string;
  uid: number;
  messageId: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  date: string;
  preview: string;
  hasAttachments: boolean;
  isRead: boolean;
  isStarred: boolean;
}

export interface MessageFull extends MessageSummary {
  cc: EmailAddress[];
  html?: string;
  text?: string;
  attachments: {
    filename: string;
    contentType: string;
    size: number;
    partId: string;
  }[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function getMessages(
  folder: string,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: MessageSummary[]; pagination: Pagination }> {
  const data = await makeRequest<{
    messages: MessageSummary[];
    pagination: Pagination;
  }>("messages", {
    query: { folder, page, limit },
  });
  return { messages: data.messages, pagination: data.pagination };
}

export async function getMessage(
  folder: string,
  uid: number
): Promise<MessageFull> {
  const data = await makeRequest<{ message: MessageFull }>("message", {
    query: { folder, uid },
  });
  return data.message;
}

// =====================
// SEARCH
// =====================

export async function searchMessages(
  folder: string,
  query: string
): Promise<MessageSummary[]> {
  const data = await makeRequest<{ messages: MessageSummary[]; total: number }>(
    "search",
    {
      query: { folder, q: query },
    }
  );
  return data.messages;
}

// =====================
// ACTIONS
// =====================

export async function moveMessage(
  folder: string,
  uid: number,
  targetFolder: string
): Promise<boolean> {
  const data = await makeRequest<{ moved: boolean }>("move", {
    method: "POST",
    body: { folder, uid, targetFolder },
  });
  return data.moved;
}

export async function deleteMessage(
  folder: string,
  uid: number,
  permanent: boolean = false
): Promise<boolean> {
  const data = await makeRequest<{ deleted: boolean }>("delete", {
    method: "POST",
    body: { folder, uid, permanent },
  });
  return data.deleted;
}

export async function setStarred(
  folder: string,
  uid: number,
  starred: boolean
): Promise<boolean> {
  const data = await makeRequest<{ starred: boolean }>("star", {
    method: "POST",
    body: { folder, uid, starred },
  });
  return data.starred;
}

export async function markAsRead(
  folder: string,
  uid: number,
  read: boolean
): Promise<boolean> {
  const data = await makeRequest<{ read: boolean }>("read", {
    method: "POST",
    body: { folder, uid, read },
  });
  return data.read;
}

// =====================
// SEND
// =====================

export interface SendEmailParams {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: {
    filename: string;
    content: string;
    contentType: string;
  }[];
}

export async function sendEmail(
  params: SendEmailParams
): Promise<{ messageId: string }> {
  const data = await makeRequest<{ messageId: string; method: string }>("send", {
    method: "POST",
    body: params as unknown as Record<string, unknown>,
  });
  return { messageId: data.messageId };
}

// =====================
// ATTACHMENTS
// =====================

export function getAttachmentUrl(
  folder: string,
  uid: number,
  partId: string
): string {
  if (!PHP_API_URL) {
    throw new PhpMailApiError("PHP Mail API not configured");
  }
  return `${PHP_API_URL}/attachment?folder=${encodeURIComponent(folder)}&uid=${uid}&partId=${encodeURIComponent(partId)}`;
}

export async function getAttachment(
  folder: string,
  uid: number,
  partId: string
): Promise<{ content: ArrayBuffer; filename: string; contentType: string }> {
  if (!PHP_API_URL || !PHP_API_KEY) {
    throw new PhpMailApiError("PHP Mail API not configured");
  }

  const url = `${PHP_API_URL}/attachment?folder=${encodeURIComponent(folder)}&uid=${uid}&partId=${encodeURIComponent(partId)}`;

  const response = await fetch(url, {
    headers: {
      "X-Api-Key": PHP_API_KEY,
    },
  });

  if (!response.ok) {
    throw new PhpMailApiError("Failed to fetch attachment", response.status);
  }

  const contentDisposition = response.headers.get("content-disposition") || "";
  const filenameMatch = contentDisposition.match(/filename="(.+)"/);
  const filename = filenameMatch ? filenameMatch[1] : "attachment";
  const contentType = response.headers.get("content-type") || "application/octet-stream";

  const content = await response.arrayBuffer();

  return { content, filename, contentType };
}
