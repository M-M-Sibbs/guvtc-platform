import "server-only";
import { and, count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";

export async function applicationsByCourse(since?: Date) {
  return db.select({ label: s.courses.name, value: count(s.applications.id) })
    .from(s.applications).innerJoin(s.courses, eq(s.applications.courseId, s.courses.id))
    .where(since ? gte(s.applications.submittedAt, since) : undefined)
    .groupBy(s.courses.name).orderBy(desc(count(s.applications.id))).limit(12);
}

export async function applicationsByWeek(weeks = 8) {
  const rows = await db.execute<{ wk: string; n: number }>(sql`
    SELECT to_char(date_trunc('week', submitted_at AT TIME ZONE 'Africa/Harare'), 'DD Mon') AS wk,
           date_trunc('week', submitted_at AT TIME ZONE 'Africa/Harare') AS d, count(*)::int AS n
    FROM applications WHERE submitted_at > now() - make_interval(weeks => ${weeks})
    GROUP BY 1, 2 ORDER BY 2`);
  return rows.rows.map((r) => ({ label: r.wk, value: r.n }));
}

/** Campaign performance: clicks → enquiries → completed applications. Aggregates only, no personal data. */
export async function campaignPerformance() {
  return db.select({
    id: s.advertisements.id, title: s.advertisements.title, status: s.advertisements.status,
    startsAt: s.advertisements.startsAt, expiresAt: s.advertisements.expiresAt, clicks: s.advertisements.clicks,
    applications: sql<number>`(SELECT count(*)::int FROM applications a WHERE a.ad_id = ${s.advertisements.id})`,
    enquiries: sql<number>`(SELECT count(*)::int FROM enquiries e WHERE e.ad_id = ${s.advertisements.id})`,
  }).from(s.advertisements).orderBy(desc(s.advertisements.clicks));
}

export async function sourcePerformance() {
  return db.select({ source: s.applications.campaignSource, n: count() }).from(s.applications)
    .where(isNotNull(s.applications.campaignSource)).groupBy(s.applications.campaignSource).orderBy(desc(count()));
}

export async function attendanceRate(courseId?: string) {
  const r = await db.select({
    present: sql<number>`count(*) filter (where ${s.attendance.status} in ('PRESENT','LATE'))::int`,
    total: sql<number>`count(*)::int`,
  }).from(s.attendance)
    .leftJoin(s.classGroups, eq(s.attendance.classGroupId, s.classGroups.id))
    .where(courseId ? and(eq(s.classGroups.courseId, courseId)) : undefined);
  return r[0].total ? Math.round((r[0].present / r[0].total) * 100) : null;
}
