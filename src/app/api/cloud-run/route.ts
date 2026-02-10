import { papers } from "@/db/schema";
import { db } from "@/lib/db";
import { inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conferences, keyword } = body;

    // Log the received data
    console.log("Received request:", { conferences, keyword });

    // Validate input
    if (
      !conferences ||
      !Array.isArray(conferences) ||
      conferences.length === 0
    ) {
      return NextResponse.json(
        { error: "学会を選択してください" },
        { status: 400 }
      );
    }

    // Generate sample numeric array (1000-1100) - these will be used as paper IDs
    const paperIds: number[] = [];
    for (let i = 1000; i <= 1100; i++) {
      paperIds.push(i);
    }

    // Check if database is available
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    // Fetch papers from database using the IDs
    const fetchedPapers = await db
      .select({
        id: papers.id,
        title: papers.title,
        url: papers.url,
        abstract: papers.abstract,
        conferenceName: papers.conferenceName,
        conferenceYear: papers.conferenceYear,
      })
      .from(papers)
      .where(inArray(papers.id, paperIds));

    console.log(`Fetched ${fetchedPapers.length} papers from database`);

    // Return the results
    return NextResponse.json({
      conferences,
      keyword,
      papers: fetchedPapers,
      count: fetchedPapers.length,
      message: `Found ${fetchedPapers.length} papers for ${conferences.length} conference(s)${keyword ? ` and keyword "${keyword}"` : ""}`,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
