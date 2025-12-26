import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { sql, isNotNull } from "drizzle-orm";

export async function GET() {
  try {
    // Get unique cities with counts
    const cities = await db
      .select({
        city: clients.city,
        count: sql<number>`count(*)::int`,
      })
      .from(clients)
      .where(isNotNull(clients.city))
      .groupBy(clients.city)
      .orderBy(sql`count(*) desc`)
      .limit(100);

    // Get unique categories with counts (top 50)
    const categories = await db
      .select({
        category: clients.category,
        count: sql<number>`count(*)::int`,
      })
      .from(clients)
      .where(isNotNull(clients.category))
      .groupBy(clients.category)
      .orderBy(sql`count(*) desc`)
      .limit(50);

    // Get all unique tags
    const tagsResult = await db.execute(sql`
      SELECT DISTINCT unnest(tags) as tag
      FROM clients
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      ORDER BY tag
      LIMIT 100
    `);

    const tags = tagsResult.rows.map((r) => (r as { tag: string }).tag);

    // Get stats
    const stats = await db
      .select({
        total: sql<number>`count(*)::int`,
        withEmail: sql<number>`count(*) filter (where email is not null)::int`,
        active: sql<number>`count(*) filter (where status = 'active')::int`,
        inactive: sql<number>`count(*) filter (where status = 'inactive')::int`,
      })
      .from(clients);

    return NextResponse.json({
      cities: cities.filter((c) => c.city),
      categories: categories.filter((c) => c.category),
      tags,
      stats: stats[0],
    });
  } catch (error) {
    console.error("Error fetching filters:", error);
    return NextResponse.json(
      { error: "Failed to fetch filters" },
      { status: 500 }
    );
  }
}
