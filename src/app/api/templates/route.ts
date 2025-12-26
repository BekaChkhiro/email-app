import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailTemplates } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const templates = await db
      .select()
      .from(emailTemplates)
      .orderBy(desc(emailTemplates.updatedAt));

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, subject, htmlContent, plainContent, variables } = body;

    if (!name || !subject || !htmlContent) {
      return NextResponse.json(
        { error: "Name, subject, and HTML content are required" },
        { status: 400 }
      );
    }

    const created = await db
      .insert(emailTemplates)
      .values({
        name,
        subject,
        htmlContent,
        plainContent: plainContent || null,
        variables: variables || [],
        isActive: true,
      })
      .returning();

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
