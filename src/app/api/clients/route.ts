import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, ilike, or, and, desc, asc, sql, isNotNull, isNull, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Filters
    const search = searchParams.get("search") || "";
    const city = searchParams.get("city") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";
    const hasEmail = searchParams.get("hasEmail") || "";
    const tag = searchParams.get("tag") || "";

    // Sorting
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(clients.companyName, `%${search}%`),
          ilike(clients.email, `%${search}%`),
          ilike(clients.city, `%${search}%`),
          ilike(clients.category, `%${search}%`)
        )
      );
    }

    if (city) {
      conditions.push(eq(clients.city, city));
    }

    if (category) {
      conditions.push(eq(clients.category, category));
    }

    if (status) {
      conditions.push(eq(clients.status, status));
    }

    if (hasEmail === "yes") {
      conditions.push(isNotNull(clients.email));
    } else if (hasEmail === "no") {
      conditions.push(isNull(clients.email));
    }

    if (tag) {
      conditions.push(sql`${tag} = ANY(${clients.tags})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get sort column
    const sortColumn = {
      company_name: clients.companyName,
      city: clients.city,
      created_at: clients.createdAt,
      email: clients.email,
    }[sortBy] || clients.createdAt;

    const orderDirection = sortOrder === "asc" ? asc : desc;

    // Execute queries
    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(clients)
        .where(whereClause)
        .orderBy(orderDirection(sortColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(clients)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No client IDs provided" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(clients)
      .where(inArray(clients.id, ids))
      .returning({ id: clients.id });

    return NextResponse.json({
      success: true,
      deletedCount: deleted.length,
    });
  } catch (error) {
    console.error("Error deleting clients:", error);
    return NextResponse.json(
      { error: "Failed to delete clients" },
      { status: 500 }
    );
  }
}
