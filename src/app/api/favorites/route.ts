import { getUserIdFromRequest } from "@/lib/auth-server";
import { db, schema } from "@/lib/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/favorites - お気に入り一覧を取得 (フォルダ情報、論文情報込み)
export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  try {
    // フォルダIDでフィルタリングする場合
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");

    const conditions = [eq(schema.favorites.userId, userId)];

    if (folderId) {
      if (folderId === "null") {
        // 未分類
        conditions.push(isNull(schema.favorites.folderId));
      } else {
        const fid = parseInt(folderId);
        if (!isNaN(fid)) {
          conditions.push(eq(schema.favorites.folderId, fid));
        }
      }
    }

    const results = await db
      .select({
        favorite: schema.favorites,
        paper: schema.papers,
        folder: schema.folders,
      })
      .from(schema.favorites)
      .innerJoin(schema.papers, eq(schema.favorites.paperId, schema.papers.id))
      .leftJoin(
        schema.folders,
        eq(schema.favorites.folderId, schema.folders.id)
      )
      .where(and(...conditions))
      .orderBy(desc(schema.favorites.createdAt));

    // 整形して返す
    const favorites = results.map((r) => ({
      ...r.favorite,
      paper: r.paper,
      folder: r.folder,
    }));

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/favorites - お気に入り追加
export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { paperId, folderId } = body;

    if (!paperId) {
      return NextResponse.json(
        { error: "Paper ID is required" },
        { status: 400 }
      );
    }

    // 既に全く同じ組み合わせ（paperId, folderId）が存在するかチェック
    const existing = await db
      .select()
      .from(schema.favorites)
      .where(
        and(
          eq(schema.favorites.userId, userId),
          eq(schema.favorites.paperId, paperId),
          folderId
            ? eq(schema.favorites.folderId, folderId)
            : isNull(schema.favorites.folderId)
        )
      );

    if (existing.length > 0) {
      // 既に存在する場合は何もしない（冪等性）
      return NextResponse.json(existing[0]);
    }

    // 新規登録
    // "Default" (null) folder acts as a regular folder now, so we don't delete it
    // when adding to other folders.

    const newFavorite = await db
      .insert(schema.favorites)
      .values({
        userId,
        paperId,
        folderId: folderId || null,
      })
      .returning();

    return NextResponse.json(newFavorite[0], { status: 201 });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
