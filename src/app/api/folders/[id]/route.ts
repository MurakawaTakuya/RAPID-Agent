import { getUserIdFromRequest } from "@/lib/auth-server";
import { db, schema } from "@/lib/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/folders/[id] - フォルダ名を変更
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const folderId = parseInt(id);
    if (isNaN(folderId)) {
      return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Valid folder name is required" },
        { status: 400 }
      );
    }

    // 自分のフォルダかつIDが一致するものを更新
    const updatedFolder = await db
      .update(schema.folders)
      .set({ name: name.trim() })
      .where(
        and(eq(schema.folders.id, folderId), eq(schema.folders.userId, userId))
      )
      .returning();

    if (updatedFolder.length === 0) {
      return NextResponse.json(
        { error: "Folder not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedFolder[0]);
  } catch (error) {
    console.error("Error updating folder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/folders/[id] - フォルダを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const folderId = parseInt(id);
    if (isNaN(folderId)) {
      return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    // フォルダの所有者確認
    const folder = await db
      .select()
      .from(schema.folders)
      .where(
        and(eq(schema.folders.id, folderId), eq(schema.folders.userId, userId))
      );

    if (folder.length === 0) {
      return NextResponse.json(
        { error: "Folder not found or unauthorized" },
        { status: 404 }
      );
    }

    // このフォルダに属するお気に入りを取得
    const favoritesInFolder = await db
      .select()
      .from(schema.favorites)
      .where(
        and(
          eq(schema.favorites.userId, userId),
          eq(schema.favorites.folderId, folderId)
        )
      );

    if (favoritesInFolder.length > 0) {
      const paperIdsInFolder = favoritesInFolder.map((f) => f.paperId);

      // 既にデフォルト（folderId=null）に存在する論文を取得
      const existingDefaults = await db
        .select()
        .from(schema.favorites)
        .where(
          and(
            eq(schema.favorites.userId, userId),
            isNull(schema.favorites.folderId),
            inArray(schema.favorites.paperId, paperIdsInFolder)
          )
        );

      const alreadyInDefaultPaperIds = new Set(
        existingDefaults.map((f) => f.paperId)
      );

      // 既にデフォルトにある論文のお気に入りは削除（重複防止）
      const toDelete = favoritesInFolder
        .filter((f) => alreadyInDefaultPaperIds.has(f.paperId))
        .map((f) => f.id);

      // デフォルトにない論文のお気に入りは folderId を null に更新
      const toUpdate = favoritesInFolder
        .filter((f) => !alreadyInDefaultPaperIds.has(f.paperId))
        .map((f) => f.id);

      if (toDelete.length > 0) {
        await db
          .delete(schema.favorites)
          .where(inArray(schema.favorites.id, toDelete));
      }

      if (toUpdate.length > 0) {
        await db
          .update(schema.favorites)
          .set({ folderId: null })
          .where(inArray(schema.favorites.id, toUpdate));
      }
    }

    // フォルダ本体を削除
    await db
      .delete(schema.folders)
      .where(
        and(eq(schema.folders.id, folderId), eq(schema.folders.userId, userId))
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
