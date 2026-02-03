import * as schema from "@/db/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. Database features will not work.");
}

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export const db = sql ? drizzle(sql, { schema }) : null;

export { schema };
