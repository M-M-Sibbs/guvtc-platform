"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { assertCan } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { assertTeaches } from "@/lib/teaching";
import { back, fail, optStr, str, int, optDate } from "@/lib/action-helpers";
import { queueAndSend, layout, p, button } from "@/lib/email";
import { appUrl } from "@/lib/app-url";

export async function createAssessment(fd: FormData) {
  const me = await assertCan("results.approve");
  const courseId = str(fd, "courseId");
  const ret = `/staff/results?course=${courseId}`;
  const weight = int(fd, "weight");
  if (!str(fd, "title") || weight == null || weight <= 0 || weight > 100) fail(ret, "Title and a weight between 1 and 100 are required.");
  const existing = await db.select({ w: s.assessments.weight }).from(s.assessments).where(eq(s.assessments.courseId, courseId));
  const total = existing.reduce((t, a) => t + a.w, 0) + weight!;
  if (total > 100) fail(ret, `Weights would total ${total}%. The weights for a course must add up to 100%.`);
  const [a] = await db.insert(s.assessments).values({ courseId, title: str(fd, "title"), type: str(fd, "type") as "CONTINUOUS", weight: weight!, maxMarks: int(fd, "maxMarks") ?? 100, scheduledAt: optDate(fd, "scheduledAt") }).returning();
  await audit(me, "assessment.create", "assessment", a.id, { courseId, weight });
  back(ret, "Assessment added.");
}

/** Lecturers enter marks; after approval only the examinations office can correct them, with a reason. */
export async function saveMarks(fd: FormData) {
  const me = await assertCan("marks.enter");
  const id = str(fd, "assessmentId");
  const ret = `/staff/results/${id}`;
  const a = await db.query.assessments.findFirst({ where: eq(s.assessments.id, id) });
  if (!a) fail("/staff/results", "Assessment not found");
  if (me.role === "LECTURER") { try { await assertTeaches(me, a!.courseId); } catch (e) { fail("/staff/results", (e as Error).message); } }
  const locked = !!a!.approvedAt;
  const isExams = can(me.role, "results.approve");
  if (locked && !isExams) fail(ret, "These marks are approved and locked. Ask the examinations office to make a correction.");
  const reason = optStr(fd, "reason");
  if (locked && !reason) fail(ret, "Give a reason for correcting approved marks — it is recorded in the audit trail.");

  const studentIds = fd.getAll("studentId").map(String);
  const current = await db.select().from(s.results).where(eq(s.results.assessmentId, id));
  const changes: { studentId: string; from: unknown; to: unknown }[] = [];
  for (const sid of studentIds) {
    const raw = str(fd, `m_${sid}`);
    const status = (str(fd, `st_${sid}`) || "RECORDED") as "RECORDED" | "ABSENT" | "INCOMPLETE" | "WITHHELD";
    const comment = optStr(fd, `c_${sid}`);
    if (raw === "" && status === "RECORDED") continue;
    const marks = status === "RECORDED" ? Number(raw) : null;
    if (status === "RECORDED" && (!Number.isFinite(marks) || marks! < 0 || marks! > a!.maxMarks)) fail(ret, `Marks must be between 0 and ${a!.maxMarks}.`);
    const prev = current.find((r) => r.studentId === sid);
    if (prev && prev.marks === marks && prev.status === status && (prev.comment ?? null) === comment) continue;
    await db.insert(s.results).values({ assessmentId: id, studentId: sid, marks, status, comment, enteredById: me.id })
      .onConflictDoUpdate({ target: [s.results.assessmentId, s.results.studentId], set: { marks, status, comment, enteredById: me.id, updatedAt: new Date() } });
    changes.push({ studentId: sid, from: prev ? { marks: prev.marks, status: prev.status } : null, to: { marks, status } });
  }
  if (changes.length) await audit(me, locked ? "result.correction" : "result.enter", "assessment", id, { changes, reason, published: !!a!.publishedAt });
  revalidatePath("/student/results");
  back(ret, changes.length ? `${changes.length} mark${changes.length === 1 ? "" : "s"} saved${locked ? " as a correction" : ""}.` : "No changes.");
}

export async function approveAssessment(fd: FormData) {
  const me = await assertCan("results.approve");
  const id = str(fd, "assessmentId");
  const a = await db.query.assessments.findFirst({ where: eq(s.assessments.id, id) });
  if (!a) fail("/staff/results", "Not found");
  const undo = str(fd, "undo") === "1";
  if (undo && a!.publishedAt) fail(`/staff/results/${id}`, "Withdraw publication before reopening marks.");
  await db.update(s.assessments).set(undo ? { approvedAt: null, approvedBy: null } : { approvedAt: new Date(), approvedBy: me.name }).where(eq(s.assessments.id, id));
  await audit(me, undo ? "assessment.reopen" : "assessment.approve", "assessment", id);
  back(`/staff/results/${id}`, undo ? "Marks reopened for lecturer editing." : "Marks approved and locked.");
}

export async function publishAssessment(fd: FormData) {
  const me = await assertCan("results.publish");
  const id = str(fd, "assessmentId");
  const ret = `/staff/results/${id}`;
  const a = await db.query.assessments.findFirst({ where: eq(s.assessments.id, id), with: { course: true } });
  if (!a) fail("/staff/results", "Not found");
  const withdraw = str(fd, "withdraw") === "1";
  if (withdraw) {
    const reason = optStr(fd, "reason");
    if (!reason) fail(ret, "Give a reason for withdrawing published results.");
    await db.update(s.assessments).set({ publishedAt: null, publishedBy: null }).where(eq(s.assessments.id, id));
    await audit(me, "assessment.unpublish", "assessment", id, { reason });
    revalidatePath("/student/results");
    back(ret, "Results withdrawn from the student portal.");
  }
  if (!a!.approvedAt) fail(ret, "Approve the marks before publishing.");
  await db.update(s.assessments).set({ publishedAt: new Date(), publishedBy: me.name }).where(eq(s.assessments.id, id));
  await audit(me, "assessment.publish", "assessment", id);
  if (fd.get("notify") === "on") {
    const studs = await db.select({ email: s.users.email, name: s.users.name }).from(s.results)
      .innerJoin(s.students, eq(s.results.studentId, s.students.id)).innerJoin(s.users, eq(s.students.userId, s.users.id))
      .where(and(eq(s.results.assessmentId, id), eq(s.users.active, true)));
    for (const st of studs) await queueAndSend({
      to: st.email, subject: `Results published: ${a!.course.name}`,
      html: layout("New results available", p(`Hello ${st.name.split(" ")[0]}, your result for ${a!.title} (${a!.course.name}) has been published.`) + button("View my results", `${appUrl()}/student/results`) + p("For security, marks are not included in this email.")),
      text: `Your result for ${a!.title} is available in the student portal.`, relatedType: "assessment", relatedId: id,
    });
  }
  revalidatePath("/student/results");
  back(ret, "Published. Students can now see these marks.");
}

