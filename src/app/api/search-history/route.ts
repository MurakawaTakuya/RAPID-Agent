import { getUserIdFromRequest } from "@/lib/auth-server";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/search-history - ユーザーの検索履歴を取得（最新30件）
export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const history = await db
      .select()
      .from(schema.searchHistories)
      .where(eq(schema.searchHistories.userId, userId))
      .orderBy(desc(schema.searchHistories.createdAt))
      .limit(30);

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching search history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/search-history - 検索履歴を追加
export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { keyword, conferences } = body;

    if (!keyword || typeof keyword !== "string") {
      return NextResponse.json(
        { error: "keyword is required" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(schema.searchHistories)
      .values({
        userId,
        keyword: keyword.trim(),
        conferences: conferences ? JSON.stringify(conferences) : null,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating search history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
