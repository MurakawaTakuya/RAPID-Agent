import { getUserIdFromRequest } from "@/lib/auth-server";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// POST /api/favorites/batch - 複数論文を一括でお気に入りに追加
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
    const { paperIds, folderId } = body;

    if (!Array.isArray(paperIds) || paperIds.length === 0) {
      return NextResponse.json(
        { error: "paperIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // folderId が指定されている場合、自分のフォルダか検証
    if (folderId) {
      const folderCheck = await db
        .select()
        .from(schema.folders)
        .where(
          and(
            eq(schema.folders.id, folderId),
            eq(schema.folders.userId, userId)
          )
        );
      if (folderCheck.length === 0) {
        return NextResponse.json(
          { error: "Folder not found or not authorized" },
          { status: 403 }
        );
      }
    }

    // 一括挿入（重複は無視）
    const values = paperIds.map((paperId: number) => ({
      userId,
      paperId,
      folderId: folderId || null,
    }));

    const inserted = await db
      .insert(schema.favorites)
      .values(values)
      .onConflictDoNothing()
      .returning();

    return NextResponse.json(
      { added: inserted.length, total: paperIds.length },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error batch adding favorites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
