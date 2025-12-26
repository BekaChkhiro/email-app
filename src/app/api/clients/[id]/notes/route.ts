import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clientNotes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const notes = await db
      .select()
      .from(clientNotes)
      .where(eq(clientNotes.clientId, id))
      .orderBy(desc(clientNotes.createdAt));

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.note || !body.note.trim()) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    const [newNote] = await db
      .insert(clientNotes)
      .values({
        clientId: id,
        note: body.note.trim(),
        createdBy: body.createdBy || "System",
      })
      .returning();

    return NextResponse.json(newNote);
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
