import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";

interface ClientImportData {
  company_name?: string | null;
  category?: string | null;
  city?: string | null;
  address?: string | null;
  identification_code?: string | null;
  phone_primary?: string | null;
  phone_secondary?: string | null;
  phone_tertiary?: string | null;
  email?: string | null;
  email_secondary?: string | null;
  website?: string | null;
  facebook?: string | null;
  director_name?: string | null;
  legal_form?: string | null;
  company_name_alt?: string | null;
  link_08?: string | null;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Normalize and validate client data
function normalizeClient(data: ClientImportData): {
  valid: boolean;
  client: typeof clients.$inferInsert | null;
  error: string | null;
} {
  // Normalize email
  let email: string | null = null;
  if (data.email) {
    const trimmed = data.email.trim().toLowerCase();
    if (trimmed && isValidEmail(trimmed)) {
      email = trimmed;
    }
  }

  // Normalize secondary email
  let emailSecondary: string | null = null;
  if (data.email_secondary) {
    const trimmed = data.email_secondary.trim().toLowerCase();
    if (trimmed && isValidEmail(trimmed)) {
      emailSecondary = trimmed;
    }
  }

  // Normalize phone numbers (remove spaces, dashes)
  const normalizePhone = (phone: string | null | undefined): string | null => {
    if (!phone) return null;
    const cleaned = phone.toString().replace(/[\s\-\(\)]/g, "").trim();
    return cleaned || null;
  };

  // Create the client object
  const client: typeof clients.$inferInsert = {
    companyName: data.company_name?.trim() || null,
    category: data.category?.trim() || null,
    city: data.city?.trim() || null,
    address: data.address?.trim() || null,
    identificationCode: data.identification_code?.toString().trim() || null,
    phonePrimary: normalizePhone(data.phone_primary),
    phoneSecondary: normalizePhone(data.phone_secondary),
    phoneTertiary: normalizePhone(data.phone_tertiary),
    email: email,
    emailSecondary: emailSecondary,
    website: data.website?.trim() || null,
    facebook: data.facebook?.trim() || null,
    directorName: data.director_name?.trim() || null,
    legalForm: data.legal_form?.trim() || null,
    companyNameAlt: data.company_name_alt?.trim() || null,
    link08: data.link_08?.trim() || null,
    status: "active",
  };

  return { valid: true, client, error: null };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be an array of clients" },
        { status: 400 }
      );
    }

    if (body.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 clients per request" },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    // Process and validate all clients
    const validClients: (typeof clients.$inferInsert)[] = [];

    body.forEach((data: ClientImportData) => {
      const { valid, client, error } = normalizeClient(data);

      if (!valid || !client) {
        result.skipped++;
        if (error) result.errors.push(error);
        return;
      }

      validClients.push(client);
    });

    if (validClients.length === 0) {
      return NextResponse.json(result);
    }

    // Batch insert with ON CONFLICT DO NOTHING
    // Using raw SQL for the ON CONFLICT clause
    try {
      const insertedRows = await db
        .insert(clients)
        .values(validClients)
        .onConflictDoNothing()
        .returning({ id: clients.id });

      result.imported = insertedRows.length;
      result.skipped += validClients.length - insertedRows.length;
    } catch {
      // If batch insert fails, try inserting one by one
      for (const client of validClients) {
        try {
          await db.insert(clients).values(client).onConflictDoNothing();
          result.imported++;
        } catch {
          result.skipped++;
          result.errors.push(
            `Failed to insert: ${client.companyName || client.email || "unknown"}`
          );
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
