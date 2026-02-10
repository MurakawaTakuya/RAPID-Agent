import { db, schema } from "@/lib/db";

interface PaperData {
  url: string;
  title: string;
  abstract?: string;
  authors?: string;
  conferenceName?: string;
  conferenceYear?: number;
  embedding?: number[];
}

/**
 * Upserts a paper into the database.
 * Uses 'title' as the unique key for conflict resolution.
 */
export async function upsertPaper(paper: PaperData) {
  if (!db) {
    throw new Error("Database not configured");
  }

  // Ensure title is present as it's the unique key
  if (!paper.title) {
    throw new Error("Title is required for upserting a paper");
  }

  // Ensure url is present as it's a required field
  if (!paper.url) {
    throw new Error("URL is required for upserting a paper");
  }

  try {
    const result = await db
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
      })
      .returning({
        id: schema.papers.id,
        url: schema.papers.url,
        title: schema.papers.title,
        abstract: schema.papers.abstract,
        authors: schema.papers.authors,
        conferenceName: schema.papers.conferenceName,
        conferenceYear: schema.papers.conferenceYear,
        createdAt: schema.papers.createdAt,
      });

    return result[0];
  } catch (error) {
    console.error("Error upserting paper:", {
      title: paper.title,
      url: paper.url.substring(0, 50),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
