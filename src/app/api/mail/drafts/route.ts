import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { emailDrafts } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const drafts = await db
      .select()
      .from(emailDrafts)
      .orderBy(desc(emailDrafts.updatedAt));

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error("Error fetching drafts:", error);
    return NextResponse.json(
      { error: "Failed to fetch drafts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      subject,
      toAddresses,
      ccAddresses,
      bccAddresses,
      htmlContent,
      plainContent,
      inReplyTo,
    } = body;

    const [draft] = await db
      .insert(emailDrafts)
      .values({
        subject,
        toAddresses: toAddresses || [],
        ccAddresses: ccAddresses || [],
        bccAddresses: bccAddresses || [],
        htmlContent,
        plainContent,
        inReplyTo,
      })
      .returning();

    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error("Error saving draft:", error);
    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }
}
