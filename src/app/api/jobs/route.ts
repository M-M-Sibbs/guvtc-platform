import { NextResponse, type NextRequest } from "next/server";
import { retryFailed } from "@/lib/email";
import { db, schema as s } from "@/db";
import { and, eq, lte } from "drizzle-orm";

/**
 * Background jobs. Call every 10–15 minutes from Vercel Cron, a system cron or uptime monitor:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/jobs
 * - retries failed emails
 * - archives adverts that expired more than 30 days ago (live/expired display itself is automatic)
 */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const retried = await retryFailed();
  const archived = await db.update(s.advertisements).set({ status: "ARCHIVED" })
    .where(and(eq(s.advertisements.status, "PUBLISHED"), lte(s.advertisements.expiresAt, new Date(Date.now() - 30 * 86400000))))
    .returning({ id: s.advertisements.id });
  return NextResponse.json({ retried, archived: archived.length });
}
