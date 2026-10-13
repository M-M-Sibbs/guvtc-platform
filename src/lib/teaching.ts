import "server-only";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import type { CurrentUser } from "./auth";

/** Staff teaching assignments determine which courses a lecturer can manage. */
export async function teachableCourseIds(me: CurrentUser): Promise<string[] | "all"> {
  if (me.role === "SUPER_ADMIN" || me.role === "LIBRARIAN" || me.role === "EXAMS" || me.role === "REGISTRAR") return "all";
  if (!me.staffId) return [];
  const rows = await db.select({ courseId: s.classGroups.courseId }).from(s.classGroups).where(eq(s.classGroups.lecturerId, me.staffId));
  return [...new Set(rows.map((r) => r.courseId))];
}

export async function assertTeaches(me: CurrentUser, courseId: string) {
  const ids = await teachableCourseIds(me);
  if (ids !== "all" && !ids.includes(courseId)) throw new Error("You are not assigned to teach this course.");
}

export async function courseOfLesson(lessonId: string) {
  const [r] = await db.select({ courseId: s.modules.courseId }).from(s.lessons).innerJoin(s.modules, eq(s.lessons.moduleId, s.modules.id)).where(eq(s.lessons.id, lessonId));
  return r?.courseId;
}
