import { db, schema } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const CLOUD_RUN_URL = process.env.PYTHON_CLOUD_RUN_URL || "";

interface Paper {
  url: string;
  title: string;
  embedding?: number[];
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!CLOUD_RUN_URL) {
    console.error("PYTHON_CLOUD_RUN_URL is not set");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  try {
    const body = await request.json();

    const response = await fetch(CLOUD_RUN_URL, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // TODO: 今後、フロントで指定したpaperだけDBに保存するように変更

    // Save papers to database (same as user registration pattern)
    if (db && data.papers && Array.isArray(data.papers)) {
      try {
        const dbClient = db; // Capture in variable to satisfy TypeScript
        await Promise.all(
          data.papers.map(async (paper: Paper) => {
            if (!paper.url || !paper.title) return;

            await dbClient
              .insert(schema.papers)
              .values({
                url: paper.url,
                title: paper.title,
                embedding: paper.embedding,
              })
              .onConflictDoUpdate({
                target: schema.papers.url,
                set: {
                  title: paper.title,
                  embedding: paper.embedding,
                },
              });
          })
        );
      } catch (dbError) {
        console.error("Error saving papers to DB:", dbError);
        // Continue even if DB save fails - return Cloud Run response
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
