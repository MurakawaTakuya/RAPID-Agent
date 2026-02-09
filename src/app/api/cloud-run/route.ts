// TODO: src/app/api/papers/route.ts と役割が被ってるところがある
import { db, schema } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const CLOUD_RUN_URL = process.env.PYTHON_CLOUD_RUN_URL || "";

interface Paper {
  url: string;
  title: string;
  abstract?: string;
  authors?: string;
  conferenceName?: string;
  conferenceYear?: number;
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

    // Save papers to database with sequential processing to avoid excessive parallel connections
    if (db && data.papers && Array.isArray(data.papers)) {
      const dbClient = db;
      let savedCount = 0;
      let failedCount = 0;

      // Filter and prepare valid papers
      const validPapers = (data.papers as Paper[]).filter((paper) => {
        if (!paper.url || !paper.title || !paper.url.startsWith("http")) {
          console.warn("Skipping paper with missing or invalid url/title:", {
            title: paper.title,
            url: paper.url?.substring(0, 200),
          });
          return false;
        }
        return true;
      });

      // Process papers sequentially to avoid excessive DB connections
      for (const paper of validPapers) {
        try {
          await dbClient
            .insert(schema.papers)
            .values({
              url: paper.url,
              title: paper.title,
              abstract: paper.abstract,
              authors: paper.authors,
              conferenceName: paper.conferenceName,
              conferenceYear: paper.conferenceYear,
              embedding: paper.embedding,
            })
            .onConflictDoUpdate({
              target: schema.papers.title,
              set: {
                url: paper.url,
                abstract: paper.abstract,
                authors: paper.authors,
                conferenceName: paper.conferenceName,
                conferenceYear: paper.conferenceYear,
                embedding: paper.embedding,
              },
            });
          savedCount++;
        } catch (dbError) {
          failedCount++;
          console.error("Error saving paper:", {
            title: paper.title,
            url: paper.url.substring(0, 50),
            error: dbError instanceof Error ? dbError.message : String(dbError),
          });
        }
      }

      console.log(
        `DB save complete: ${savedCount} saved, ${failedCount} failed out of ${data.papers.length} papers`
      );
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
