import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { computeFinal, gradeFor } from "./grading";

/** Courses this student may access. Every student page/action goes through this. */
export async function accessibleCourseIds(studentId: string) {
  const rows = await db.select({ courseId: s.enrolments.courseId }).from(s.enrolments)
    .where(and(eq(s.enrolments.studentId, studentId), or(eq(s.enrolments.status, "ACTIVE"), eq(s.enrolments.status, "COMPLETED"))));
  return rows.map((r) => r.courseId);
}

export async function assertCourseAccess(studentId: string, courseId: string) {
  const ids = await accessibleCourseIds(studentId);
  if (!ids.includes(courseId)) throw new Error("You are not enrolled in this course.");
}

export async function lessonWithAccess(studentId: string, lessonId: string) {
  const lesson = await db.query.lessons.findFirst({ where: and(eq(s.lessons.id, lessonId), eq(s.lessons.published, true)), with: { module: { with: { course: true } } } });
  if (!lesson) return null;
  const ids = await accessibleCourseIds(studentId);
  return ids.includes(lesson.module.courseId) ? lesson : null;
}

export async function courseProgress(studentId: string, courseIds: string[]) {
  if (!courseIds.length) return {} as Record<string, { done: number; total: number }>;
  const rows = await db.select({
    courseId: s.modules.courseId,
    total: sql<number>`count(${s.lessons.id})::int`,
    done: sql<number>`count(${s.lessonProgress.id})::int`,
  }).from(s.lessons)
    .innerJoin(s.modules, eq(s.lessons.moduleId, s.modules.id))
    .leftJoin(s.lessonProgress, and(eq(s.lessonProgress.lessonId, s.lessons.id), eq(s.lessonProgress.studentId, studentId)))
    .where(and(inArray(s.modules.courseId, courseIds), eq(s.lessons.published, true)))
    .groupBy(s.modules.courseId);
  return Object.fromEntries(rows.map((r) => [r.courseId, { done: r.done, total: r.total }]));
}

/** Only PUBLISHED assessments are ever returned to students. */
export async function publishedResults(studentId: string) {
  const courseIds = await accessibleCourseIds(studentId);
  if (!courseIds.length) return [];
  const courses = await db.query.courses.findMany({
    where: inArray(s.courses.id, courseIds),
    with: { assessments: { orderBy: asc(s.assessments.scheduledAt) } },
  });
  const res = await db.select().from(s.results).where(eq(s.results.studentId, studentId));
  return courses.map((c) => {
    const published = c.assessments.filter((a) => a.publishedAt);
    const rows = published.map((a) => {
      const r = res.find((x) => x.assessmentId === a.id);
      return { assessment: a, result: r ?? null };
    });
    const allWeight = c.assessments.reduce((t, a) => t + a.weight, 0);
    const pubWeight = published.reduce((t, a) => t + a.weight, 0);
    const complete = c.assessments.length > 0 && pubWeight === allWeight && rows.every((r) => r.result);
    const final = complete
      ? computeFinal(rows.map((r) => ({ weight: r.assessment.weight, maxMarks: r.assessment.maxMarks, marks: r.result!.marks, status: r.result!.status })))
      : null;
    return { course: c, rows, pending: c.assessments.length - published.length, final, grade: final != null ? gradeFor(final) : null };
  });
}

export async function upcomingLive(courseIds: string[], limit = 10) {
  if (!courseIds.length) return [];
  return db.select({ lesson: s.lessons, courseName: s.courses.name, courseId: s.courses.id })
    .from(s.lessons).innerJoin(s.modules, eq(s.lessons.moduleId, s.modules.id)).innerJoin(s.courses, eq(s.modules.courseId, s.courses.id))
    .where(and(inArray(s.courses.id, courseIds), eq(s.lessons.type, "LIVE"), eq(s.lessons.published, true), isNotNull(s.lessons.startsAt),
      sql`${s.lessons.startsAt} + make_interval(mins => coalesce(${s.lessons.durationMins}, 60)) > now()`))
    .orderBy(asc(s.lessons.startsAt)).limit(limit);
}

export async function pastLive(courseIds: string[], limit = 20) {
  if (!courseIds.length) return [];
  return db.select({ lesson: s.lessons, courseName: s.courses.name })
    .from(s.lessons).innerJoin(s.modules, eq(s.lessons.moduleId, s.modules.id)).innerJoin(s.courses, eq(s.modules.courseId, s.courses.id))
    .where(and(inArray(s.courses.id, courseIds), eq(s.lessons.type, "LIVE"), eq(s.lessons.published, true),
      sql`${s.lessons.startsAt} + make_interval(mins => coalesce(${s.lessons.durationMins}, 60)) <= now()`))
    .orderBy(desc(s.lessons.startsAt)).limit(limit);
}

export function liveWindow(startsAt: Date | null, durationMins: number | null) {
  if (!startsAt) return "unscheduled" as const;
  const now = Date.now();
  const start = startsAt.getTime();
  const end = start + (durationMins ?? 60) * 60000;
  if (now < start - 15 * 60000) return "upcoming" as const;
  if (now <= end) return "open" as const;
  return "ended" as const;
}
