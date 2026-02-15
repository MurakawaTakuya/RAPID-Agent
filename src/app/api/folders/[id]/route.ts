import { getUserIdFromRequest } from "@/lib/auth-server";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
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
