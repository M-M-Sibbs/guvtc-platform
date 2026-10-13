"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStudent } from "@/lib/auth";
import { assertCourseAccess, lessonWithAccess } from "@/lib/student-data";
import { collectUploads, UploadError } from "@/lib/storage";
import { liveWindow } from "@/lib/student-data";

export async function markLessonComplete(lessonId: string, complete: boolean) {
  const me = await requireStudent();
  const lesson = await lessonWithAccess(me.studentId, lessonId);
  if (!lesson) throw new Error("Lesson not found");
  if (complete) {
    await db.insert(s.lessonProgress).values({ lessonId, studentId: me.studentId }).onConflictDoNothing();
  } else {
    await db.delete(s.lessonProgress).where(and(eq(s.lessonProgress.lessonId, lessonId), eq(s.lessonProgress.studentId, me.studentId)));
  }
  revalidatePath(`/student/lessons/${lessonId}`);
  revalidatePath(`/student/courses/${lesson.module.courseId}`);
}

/** Joining a live class records attendance automatically, then returns the meeting link. */
export async function joinLiveLesson(lessonId: string) {
  const me = await requireStudent();
  const lesson = await lessonWithAccess(me.studentId, lessonId);
  if (!lesson || lesson.type !== "LIVE" || !lesson.meetingUrl) throw new Error("Live class not available");
  if (liveWindow(lesson.startsAt, lesson.durationMins) !== "open") throw new Error("This class is not open yet");
  const enrol = await db.query.enrolments.findFirst({ where: and(eq(s.enrolments.studentId, me.studentId), eq(s.enrolments.courseId, lesson.module.courseId)) });
  const date = new Date().toISOString().slice(0, 10);
  await db.insert(s.attendance).values({
    studentId: me.studentId, classGroupId: enrol?.classGroupId ?? null, lessonId, date, status: "PRESENT", recordedById: "auto:live-join",
  }).onConflictDoNothing();
  return lesson.meetingUrl;
}

export type SubmitState = { ok?: boolean; message?: string };

export async function submitAssignment(_: SubmitState, fd: FormData): Promise<SubmitState> {
  const me = await requireStudent();
  const assignmentId = String(fd.get("assignmentId"));
  const a = await db.query.assignments.findFirst({ where: and(eq(s.assignments.id, assignmentId), eq(s.assignments.published, true)) });
  if (!a) return { message: "Assignment not found." };
  try { await assertCourseAccess(me.studentId, a.courseId); } catch { return { message: "You are not enrolled in this course." }; }
  const existing = await db.query.submissions.findFirst({ where: and(eq(s.submissions.assignmentId, a.id), eq(s.submissions.studentId, me.studentId)) });
  if (existing?.gradedAt) return { message: "This assignment has already been marked, so it can no longer be changed." };
  const text = String(fd.get("text") ?? "").trim().slice(0, 10000);
  let upload: { key: string; fileName: string } | null = null;
  try {
    upload = (await collectUploads(fd, "file", `submissions/${a.id}`, "resource", 1))[0] ?? null;
  } catch (e) {
    if (e instanceof UploadError) return { message: e.message };
    throw e;
  }
  if (!text && !upload && !existing?.fileKey) return { message: "Write an answer or attach a file before submitting." };
  await db.insert(s.submissions).values({
    assignmentId: a.id, studentId: me.studentId, text: text || null, fileKey: upload?.key ?? null, fileName: upload?.fileName ?? null,
  }).onConflictDoUpdate({
    target: [s.submissions.assignmentId, s.submissions.studentId],
    set: { text: text || null, ...(upload ? { fileKey: upload.key, fileName: upload.fileName } : {}), submittedAt: new Date() },
  });
  revalidatePath("/student/assignments");
  return { ok: true, message: new Date() > a.dueAt ? "Submitted after the deadline — your lecturer will see it was late." : "Submitted. You can update it until it is marked." };
}

export type QuizResult = { score: number; total: number; review: { id: string; correct: boolean; correctIndex: number; explanation: string | null }[] };

export async function submitQuiz(quizId: string, answers: Record<string, number>): Promise<QuizResult> {
  const me = await requireStudent();
  const quiz = await db.query.quizzes.findFirst({ where: and(eq(s.quizzes.id, quizId), eq(s.quizzes.published, true)), with: { questions: true } });
  if (!quiz) throw new Error("Quiz not found");
  await assertCourseAccess(me.studentId, quiz.courseId);
  const review = quiz.questions.map((q) => ({ id: q.id, correct: answers[q.id] === q.correctIndex, correctIndex: q.correctIndex, explanation: q.explanation }));
  const score = review.filter((r) => r.correct).length;
  const clean = Object.fromEntries(Object.entries(answers).filter(([k]) => quiz.questions.some((q) => q.id === k)));
  await db.insert(s.quizAttempts).values({ quizId, studentId: me.studentId, score, total: quiz.questions.length, answers: clean });
  revalidatePath(`/student/courses/${quiz.courseId}`);
  return { score, total: quiz.questions.length, review };
}
