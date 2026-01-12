import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFolders } from "@/lib/php-mail-api";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folders = await getFolders();

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch folders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
