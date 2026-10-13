"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { assertTeaches, courseOfLesson } from "@/lib/teaching";
import { back, fail, optStr, str, int, optDate, bool } from "@/lib/action-helpers";
import { collectUploads, UploadError } from "@/lib/storage";
import { queueAndSend, layout, p, button } from "@/lib/email";
import { fmtDateTime } from "@/lib/utils";
import { appUrl } from "@/lib/app-url";

const path = (courseId: string, tab = "") => `/staff/elearning/${courseId}${tab ? `?tab=${tab}` : ""}`;

async function guard(courseId: string) {
  const me = await assertCan("elearning.manage");
  try { await assertTeaches(me, courseId); } catch (e) { fail("/staff/elearning", (e as Error).message); }
  return me;
}

export async function saveModule(fd: FormData) {
  const courseId = str(fd, "courseId");
  const me = await guard(courseId);
  if (!str(fd, "title")) fail(path(courseId), "Module title is required.");
  const id = str(fd, "id");
  const values = { courseId, title: str(fd, "title"), objectives: optStr(fd, "objectives"), order: int(fd, "order") ?? 0 };
  if (id) await db.update(s.modules).set(values).where(and(eq(s.modules.id, id), eq(s.modules.courseId, courseId)));
  else await db.insert(s.modules).values(values);
  await audit(me, id ? "module.update" : "module.create", "course", courseId, { title: values.title });
  back(path(courseId), "Module saved.");
}

const safeEmbed = (u: string | null) => (!u ? null : /^https:\/\//.test(u) ? u : null);

export async function saveLesson(fd: FormData) {
  const courseId = str(fd, "courseId");
  const me = await guard(courseId);
  const moduleId = str(fd, "moduleId");
  const mod = await db.query.modules.findFirst({ where: and(eq(s.modules.id, moduleId), eq(s.modules.courseId, courseId)) });
  if (!mod) fail(path(courseId), "Choose a module.");
  const type = str(fd, "type") as "LIVE" | "RECORDED" | "NOTES";
  if (!str(fd, "title")) fail(path(courseId), "Lesson title is required.");
  if (type === "LIVE" && (!optDate(fd, "startsAt") || !optStr(fd, "meetingUrl"))) fail(path(courseId), "Live lessons need a start time and a meeting link (Google Meet or Zoom).");
  if (type === "RECORDED" && !optStr(fd, "videoUrl")) fail(path(courseId), "Recorded lessons need a video link.");
  let file: { key: string; fileName: string } | null = null;
  try { file = (await collectUploads(fd, "file", `resources/${courseId}`, "resource", 1))[0] ?? null; }
  catch (e) { if (e instanceof UploadError) fail(path(courseId), e.message); throw e; }
  const values = {
    moduleId, title: str(fd, "title"), type, content: optStr(fd, "content"),
    videoUrl: safeEmbed(optStr(fd, "videoUrl")), meetingUrl: safeEmbed(optStr(fd, "meetingUrl")), recordingUrl: safeEmbed(optStr(fd, "recordingUrl")),
    startsAt: optDate(fd, "startsAt"), durationMins: int(fd, "durationMins"), published: bool(fd, "published"), order: int(fd, "order") ?? 0,
    ...(file ? { fileKey: file.key, fileName: file.fileName } : {}),
  };
  const id = str(fd, "id");
  let lessonId = id;
  if (id) {
    if ((await courseOfLesson(id)) !== courseId) fail(path(courseId), "Lesson not in this course.");
    await db.update(s.lessons).set(values).where(eq(s.lessons.id, id));
  } else {
    const [row] = await db.insert(s.lessons).values(values).returning();
    lessonId = row.id;
  }
  await audit(me, id ? "lesson.update" : "lesson.create", "lesson", lessonId, { title: values.title, type });

  // Tell enrolled students about a newly scheduled live class.
  if (!id && type === "LIVE" && values.published && fd.get("notify") === "on") {
    const course = await db.query.courses.findFirst({ where: eq(s.courses.id, courseId) });
    const studs = await db.select({ email: s.users.email, name: s.users.name }).from(s.enrolments)
      .innerJoin(s.students, eq(s.enrolments.studentId, s.students.id)).innerJoin(s.users, eq(s.students.userId, s.users.id))
      .where(and(eq(s.enrolments.courseId, courseId), eq(s.enrolments.status, "ACTIVE"), eq(s.users.active, true)));
    for (const st of studs) {
      await queueAndSend({
        to: st.email, subject: `Live class scheduled: ${values.title}`,
        html: layout("New live class", p(`Hello ${st.name.split(" ")[0]}, a live class has been scheduled for ${course?.name}.`) + p(`${values.title} — ${fmtDateTime(values.startsAt)} (${values.durationMins ?? 60} minutes)`) + button("Open in the student portal", `${appUrl()}/student/lessons/${lessonId}`)),
        text: `${values.title} — ${fmtDateTime(values.startsAt)}. Join from the student portal.`, relatedType: "lesson", relatedId: lessonId,
      });
    }
  }
  revalidatePath("/student", "layout");
  back(path(courseId), "Lesson saved.");
}

export async function deleteLesson(fd: FormData) {
  const courseId = str(fd, "courseId");
  const me = await guard(courseId);
  const id = str(fd, "id");
  if ((await courseOfLesson(id)) !== courseId) fail(path(courseId), "Lesson not in this course.");
  // Unpublish instead of deleting so attendance and progress history are kept.
  await db.update(s.lessons).set({ published: false }).where(eq(s.lessons.id, id));
  await audit(me, "lesson.unpublish", "lesson", id);
  back(path(courseId), "Lesson hidden from students (history kept).");
}

export async function saveAssignment(fd: FormData) {
  const courseId = str(fd, "courseId");
  const me = await guard(courseId);
  const dueAt = optDate(fd, "dueAt");
  if (!str(fd, "title") || !str(fd, "instructions") || !dueAt) fail(path(courseId, "assignments"), "Title, instructions and deadline are required.");
  const values = { courseId, title: str(fd, "title"), instructions: str(fd, "instructions"), dueAt: dueAt!, maxMarks: int(fd, "maxMarks") ?? 100, practical: bool(fd, "practical"), published: true };
  const id = str(fd, "id");
  if (id) await db.update(s.assignments).set(values).where(and(eq(s.assignments.id, id), eq(s.assignments.courseId, courseId)));
  else await db.insert(s.assignments).values(values);
  await audit(me, id ? "assignment.update" : "assignment.create", "course", courseId, { title: values.title });
  back(path(courseId, "assignments"), "Assignment saved.");
}

export async function gradeSubmission(fd: FormData) {
  const courseId = str(fd, "courseId");
  const me = await guard(courseId);
  const sub = await db.query.submissions.findFirst({ where: eq(s.submissions.id, str(fd, "submissionId")), with: { assignment: true } });
  if (!sub || sub.assignment.courseId !== courseId) fail(path(courseId, "assignments"), "Submission not found.");
  const marks = int(fd, "marks");
  if (marks == null || marks < 0 || marks > sub!.assignment.maxMarks) fail(path(courseId, "assignments"), `Marks must be between 0 and ${sub!.assignment.maxMarks}.`);
  await db.update(s.submissions).set({ marks, feedback: optStr(fd, "feedback"), gradedAt: new Date(), gradedById: me.staffId ?? me.id }).where(eq(s.submissions.id, sub!.id));
  await audit(me, sub!.gradedAt ? "submission.regrade" : "submission.grade", "submission", sub!.id, { marks, previous: sub!.marks });
  back(path(courseId, "assignments"), "Marked. The student can now see the mark and feedback.");
}

export async function saveQuiz(fd: FormData) {
  const courseId = str(fd, "courseId");
  const me = await guard(courseId);
  // Questions format: one block per question, blank line between.
  // First line = question; following lines = options; prefix the correct option with *
  const blocks = str(fd, "questions").split(/\n\s*\n/).map((b) => b.split("\n").map((l) => l.trim()).filter(Boolean)).filter((b) => b.length >= 3);
  const questions = blocks.map((b, i) => {
    const opts = b.slice(1);
    const correctIndex = opts.findIndex((o) => o.startsWith("*"));
    return { prompt: b[0], options: opts.map((o) => o.replace(/^\*\s*/, "")), correctIndex, order: i };
  });
  if (!str(fd, "title") || !questions.length) fail(path(courseId, "quizzes"), "Add a title and at least one question.");
  const bad = questions.findIndex((q) => q.correctIndex < 0);
  if (bad >= 0) fail(path(courseId, "quizzes"), `Question ${bad + 1}: mark the correct answer with *.`);
  await db.transaction(async (tx) => {
    const [quiz] = await tx.insert(s.quizzes).values({ courseId, title: str(fd, "title"), description: optStr(fd, "description") }).returning();
    await tx.insert(s.quizQuestions).values(questions.map((q) => ({ ...q, quizId: quiz.id })));
  });
  await audit(me, "quiz.create", "course", courseId, { title: str(fd, "title"), questions: questions.length });
  back(path(courseId, "quizzes"), `Quiz created with ${questions.length} questions.`);
}

export async function postCourseAnnouncement(fd: FormData) {
  const courseId = str(fd, "courseId");
  const me = await guard(courseId);
  if (!str(fd, "title") || !str(fd, "body")) fail(path(courseId, "announcements"), "Title and message are required.");
  await db.insert(s.announcements).values({ title: str(fd, "title"), body: str(fd, "body"), audience: "COURSE", courseId, authorId: me.id });
  if (fd.get("email") === "on") {
    const studs = await db.select({ email: s.users.email }).from(s.enrolments).innerJoin(s.students, eq(s.enrolments.studentId, s.students.id)).innerJoin(s.users, eq(s.students.userId, s.users.id))
      .where(and(eq(s.enrolments.courseId, courseId), inArray(s.enrolments.status, ["ACTIVE"])));
    for (const st of studs) await queueAndSend({ to: st.email, subject: str(fd, "title"), html: layout(str(fd, "title"), p(str(fd, "body"))), text: str(fd, "body"), relatedType: "announcement" });
  }
  await audit(me, "announcement.create", "course", courseId, { title: str(fd, "title") });
  back(path(courseId, "announcements"), "Announcement posted.");
}
