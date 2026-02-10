// TODO: DBとAPIをログインユーザーのみ&セキュリティチェックありにする

import { db, schema } from "@/lib/db";
import { upsertPaper } from "@/services/papers";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/papers?url=xxx - 論文をURLで検索
export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  const url = request.nextUrl.searchParams.get("url");

  try {
    if (url) {
      // URL で検索
      const result = await db
        .select({
          id: schema.papers.id,
          url: schema.papers.url,
          title: schema.papers.title,
          abstract: schema.papers.abstract,
          authors: schema.papers.authors,
          embedding: schema.papers.embedding,
          createdAt: schema.papers.createdAt,
        })
        .from(schema.papers)
        .where(eq(schema.papers.url, url));

      return NextResponse.json(result[0] || null);
    } else {
      // 全件取得（制限付き）
      const result = await db
        .select({
          id: schema.papers.id,
          url: schema.papers.url,
          title: schema.papers.title,
          abstract: schema.papers.abstract,
          authors: schema.papers.authors,
          embedding: schema.papers.embedding,
          createdAt: schema.papers.createdAt,
        })
        .from(schema.papers)
        .limit(100);

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("Error fetching papers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/papers - 論文を追加（embedding 付き）
export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  // TODO: Add security check (e.g., INTERNAL_API_KEY) to restrict access to internal systems only.
  // const apiKey = request.headers.get('X-Internal-Secret');
  // if (apiKey !== process.env.INTERNAL_API_KEY) { ... }

  try {
    const body = await request.json();
    const { url, title, abstract, authors, embedding } = body;

    if (!url || !title) {
      return NextResponse.json(
        { error: "url and title are required" },
        { status: 400 }
      );
    }

    const result = await upsertPaper({
      url,
      title,
      abstract,
      authors,
      embedding,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating paper:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
