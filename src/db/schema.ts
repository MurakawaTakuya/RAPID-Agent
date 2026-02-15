import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
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
export const papers = pgTable(
  "papers",
  {
    id: serial("id").primaryKey(),
    url: text("url").notNull(),
    title: text("title").unique().notNull(),
    abstract: text("abstract"),
    authors: text("authors"),
    conferenceName: text("conference_name"),
    conferenceYear: integer("conference_year"),
    embedding: vector("embedding", { dimensions: 768 }), // Gemini gemini-embedding-001 (output_dimensionality: 768)
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    conferenceNameNormalizedIdx: index(
      "idx_papers_conference_name_normalized"
    ).on(sql`(LOWER(REPLACE(${table.conferenceName}, ' ', '')))`),
  })
);

// 型エクスポート
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Paper = typeof papers.$inferSelect;
export type NewPaper = typeof papers.$inferInsert;

// フォルダテーブル
export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull(), // User.id (Firebase UID)
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// お気に入りテーブル
export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 128 }).notNull(), // User.id (Firebase UID)
    paperId: integer("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    folderId: integer("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }), // Nullable (未分類など)
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_favorites_user_id").on(table.userId),
    folderIdIdx: index("idx_favorites_folder_id").on(table.folderId),
    uniqueFavorite: uniqueIndex("unique_favorite_idx").on(
      table.userId,
      table.paperId,
      sql`coalesce(${table.folderId}, -1)`
    ),
  })
);

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;

// 検索履歴テーブル
export const searchHistories = pgTable(
  "search_histories",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    keyword: varchar("keyword", { length: 500 }).notNull(),
    conferences: text("conferences"), // JSON string of selected conferences
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_search_history_user_id").on(table.userId),
  })
);

export type SearchHistory = typeof searchHistories.$inferSelect;
export type NewSearchHistory = typeof searchHistories.$inferInsert;
