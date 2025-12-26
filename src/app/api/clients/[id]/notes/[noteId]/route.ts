import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clientNotes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId } = await params;

    const deleted = await db
      .delete(clientNotes)
      .where(
        and(
          eq(clientNotes.id, noteId),
          eq(clientNotes.clientId, id)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
