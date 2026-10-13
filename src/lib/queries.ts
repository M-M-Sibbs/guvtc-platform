import "server-only";
import { and, asc, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import type { AdPlacement } from "@/db/schema";

/** Live = published, inside its schedule window. Expired adverts disappear automatically. */
export function liveAdCondition(now = new Date()) {
  return and(
    eq(s.advertisements.status, "PUBLISHED"),
    or(isNull(s.advertisements.startsAt), lte(s.advertisements.startsAt, now)),
    or(isNull(s.advertisements.expiresAt), gt(s.advertisements.expiresAt, now)),
  );
}

export async function getLiveAds(placement: AdPlacement, limit = 6) {
  return db.select().from(s.advertisements)
    .where(and(liveAdCondition(), eq(s.advertisements.placement, placement)))
    .orderBy(desc(s.advertisements.pinned), desc(s.advertisements.priority), desc(s.advertisements.startsAt))
    .limit(limit);
}

export function adState(ad: { status: string; startsAt: Date | null; expiresAt: Date | null }, now = new Date()) {
  if (ad.status !== "PUBLISHED") return ad.status;
  if (ad.startsAt && ad.startsAt > now) return "SCHEDULED";
  if (ad.expiresAt && ad.expiresAt <= now) return "EXPIRED";
  return "LIVE";
}

export async function getCatalogue() {
  return db.query.courseCategories.findMany({
    orderBy: asc(s.courseCategories.sortOrder),
    with: {
      courses: {
        where: or(eq(s.courses.status, "OPEN"), eq(s.courses.status, "CLOSED")),
        orderBy: asc(s.courses.sortOrder),
        with: { intakes: { where: eq(s.intakes.status, "OPEN"), orderBy: asc(s.intakes.startDate) } },
      },
    },
  });
}

export async function getCourseBySlug(slug: string) {
  return db.query.courses.findFirst({
    where: and(eq(s.courses.slug, slug), sql`${s.courses.status} <> 'DRAFT'`),
    with: {
      category: true,
      intakes: { where: and(eq(s.intakes.status, "OPEN"), gt(s.intakes.startDate, new Date())), orderBy: asc(s.intakes.startDate) },
      feeItems: true,
      classGroups: { with: { lecturer: { with: { user: true } } } },
    },
  });
}

/** Next open intakes across all courses, soonest deadline first. */
export async function getUpcomingIntakes(limit = 8) {
  const now = new Date();
  return db.select({
    id: s.intakes.id, name: s.intakes.name, startDate: s.intakes.startDate, deadline: s.intakes.applicationDeadline,
    courseName: s.courses.name, courseSlug: s.courses.slug, isAI: s.courseCategories.isAI,
  })
    .from(s.intakes)
    .innerJoin(s.courses, eq(s.intakes.courseId, s.courses.id))
    .innerJoin(s.courseCategories, eq(s.courses.categoryId, s.courseCategories.id))
    .where(and(eq(s.intakes.status, "OPEN"), eq(s.courses.status, "OPEN"), gt(s.intakes.applicationDeadline, now)))
    .orderBy(asc(s.intakes.applicationDeadline), desc(s.courses.featured), asc(s.courses.name))
    .limit(limit);
}

export async function getPublishedNews(limit = 20, kind?: "NEWS" | "EVENT" | "NOTICE" | "OPPORTUNITY") {
  return db.select().from(s.newsPosts)
    .where(and(eq(s.newsPosts.published, true), kind ? eq(s.newsPosts.kind, kind) : undefined))
    .orderBy(desc(s.newsPosts.publishedAt))
    .limit(limit);
}

export async function getOpenCoursesForSelect() {
  return db.query.courses.findMany({
    where: eq(s.courses.status, "OPEN"),
    orderBy: [asc(s.courses.name)],
    with: {
      category: true,
      intakes: { where: and(eq(s.intakes.status, "OPEN"), gt(s.intakes.startDate, new Date())), orderBy: asc(s.intakes.startDate) },
    },
  });
}
