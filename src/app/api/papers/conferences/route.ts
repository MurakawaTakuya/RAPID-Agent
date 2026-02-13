import { getUserIdFromRequest } from "@/lib/auth-server";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

interface ConferenceGroup {
  heading: string;
  years: number[];
}

// GET /api/papers/conferences - DBに存在する学会・年の一覧を返す
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
    // conference_name と conference_year の組み合わせを取得
    const result = await db
      .select({
        conferenceName: schema.papers.conferenceName,
        conferenceYear: schema.papers.conferenceYear,
      })
      .from(schema.papers)
      .where(sql`${schema.papers.conferenceName} IS NOT NULL`)
      .groupBy(schema.papers.conferenceName, schema.papers.conferenceYear)
      .orderBy(
        schema.papers.conferenceName,
        sql`${schema.papers.conferenceYear} DESC`
      );

    // conference name でグループ化
    const groupMap = new Map<string, number[]>();

    for (const row of result) {
      if (!row.conferenceName) {
        continue;
      }

      const name = row.conferenceName;
      if (!groupMap.has(name)) {
        groupMap.set(name, []);
      }

      if (row.conferenceYear) {
        groupMap.get(name)!.push(row.conferenceYear);
      }
    }

    // グループを配列に変換
    const conferences: ConferenceGroup[] = Array.from(groupMap.entries()).map(
      ([heading, years]) => ({
        heading,
        years,
      })
    );

    return NextResponse.json(conferences);
  } catch (error) {
    console.error("Error fetching conferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
