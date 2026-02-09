import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  vector,
} from "drizzle-orm/pg-core";

// ユーザーテーブル
export const users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(), // Firebase UID
  email: varchar("email", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 100 }),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 論文テーブル（共有キャッシュ）
export const papers = pgTable("papers", {
  id: serial("id").primaryKey(),
  url: text("url").unique().notNull(),
  title: text("title").notNull(),
  abstract: text("abstract"),
  authors: text("authors"),
  conferenceName: text("conference_name"),
  conferenceYear: integer("conference_year"),
  embedding: vector("embedding", { dimensions: 768 }), // Gemini gemini-embedding-001 (output_dimensionality: 768)
  createdAt: timestamp("created_at").defaultNow(),
});

// 型エクスポート
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Paper = typeof papers.$inferSelect;
export type NewPaper = typeof papers.$inferInsert;
