import "server-only";
import { timingSafeEqual } from "node:crypto";
import { count } from "drizzle-orm";
import { db, schema as s } from "@/db";

/** First-run setup is possible only while the database has no user accounts at all. */
export async function setupNeeded() {
  const [{ n }] = await db.select({ n: count() }).from(s.users);
  return n === 0;
}

export function setupCodeConfigured() {
  return !!process.env.SETUP_CODE || !process.env.VERCEL;
}

export function codeMatches(given: string) {
  const expected = process.env.SETUP_CODE;
  if (!expected) return !process.env.VERCEL; // local development needs no code
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

