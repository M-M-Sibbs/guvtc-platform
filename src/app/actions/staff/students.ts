"use server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { back, fail, firstError, optStr, str, optDate } from "@/lib/action-helpers";
import { nextStudentNumber, randomPasswordHash, createSetPasswordLink, sendWelcome } from "@/lib/accounts";

export async function createStudent(fd: FormData) {
  const me = await assertCan("students.manage");
  const parsed = z.object({ name: z.string().min(3, "Full name is required"), email: z.string().email("Valid email required"), courseId: z.string().min(1, "Choose a course") })
    .safeParse({ name: str(fd, "name"), email: str(fd, "email").toLowerCase(), courseId: str(fd, "courseId") });
  if (!parsed.success) fail("/staff/students", firstError(parsed.error));
  const d = parsed.data!;
  if (await db.query.users.findFirst({ where: eq(s.users.email, d.email) })) fail("/staff/students", "An account with that email already exists.");
  const res = await db.transaction(async (tx) => {
    const [user] = await tx.insert(s.users).values({ email: d.email, name: d.name, role: "STUDENT", passwordHash: await randomPasswordHash() }).returning();
    const [student] = await tx.insert(s.students).values({ userId: user.id, studentNumber: await nextStudentNumber(tx), phone: optStr(fd, "phone") }).returning();
    await tx.insert(s.enrolments).values({ studentId: student.id, courseId: d.courseId, intakeId: optStr(fd, "intakeId"), classGroupId: optStr(fd, "classGroupId") });
    return { user, student, link: await createSetPasswordLink(user.id, 7, tx) };
  });
  await audit(me, "student.create", "student", res.student.id, { studentNumber: res.student.studentNumber });
  const course = await db.query.courses.findFirst({ where: eq(s.courses.id, d.courseId) });
  await sendWelcome({ to: d.email, name: d.name, link: res.link, studentNumber: res.student.studentNumber, course: course?.name });
  back(`/staff/students/${res.student.id}`, `Student ${res.student.studentNumber} created and welcome email sent.`);
}

export async function updateStudent(fd: FormData) {
  const me = await assertCan("students.manage");
  const id = str(fd, "id");
  const before = await db.query.students.findFirst({ where: eq(s.students.id, id), with: { user: true } });
  if (!before) fail("/staff/students", "Student not found");
  const changes = { phone: optStr(fd, "phone"), address: optStr(fd, "address"), emergencyContact: optStr(fd, "emergencyContact"), nationalId: optStr(fd, "nationalId"), dateOfBirth: optDate(fd, "dateOfBirth") };
  await db.update(s.students).set(changes).where(eq(s.students.id, id));
  if (str(fd, "name") && str(fd, "name") !== before!.user.name) await db.update(s.users).set({ name: str(fd, "name") }).where(eq(s.users.id, before!.userId));
  const changed = Object.entries(changes).filter(([k, v]) => String((before as Record<string, unknown>)[k] ?? "") !== String(v ?? "")).map(([k]) => k);
  await audit(me, "student.update", "student", id, { changed, reason: optStr(fd, "reason") });
  back(`/staff/students/${id}`, "Student record updated.");
}

export async function updateEnrolment(fd: FormData) {
  const me = await assertCan("students.manage");
  const id = str(fd, "enrolmentId");
  const status = str(fd, "status") as "ACTIVE" | "COMPLETED" | "WITHDRAWN" | "SUSPENDED";
  const [e] = await db.update(s.enrolments).set({ status, classGroupId: optStr(fd, "classGroupId"), completedAt: status === "COMPLETED" ? new Date() : null }).where(eq(s.enrolments.id, id)).returning();
  await audit(me, "enrolment.update", "student", e.studentId, { enrolmentId: id, status });
  back(`/staff/students/${e.studentId}`, "Enrolment updated.");
}

export async function addEnrolment(fd: FormData) {
  const me = await assertCan("students.manage");
  const studentId = str(fd, "studentId");
  const courseId = str(fd, "courseId");
  if (await db.query.enrolments.findFirst({ where: and(eq(s.enrolments.studentId, studentId), eq(s.enrolments.courseId, courseId)) })) fail(`/staff/students/${studentId}`, "Already enrolled on that course.");
  await db.insert(s.enrolments).values({ studentId, courseId, classGroupId: optStr(fd, "classGroupId") });
  await audit(me, "enrolment.create", "student", studentId, { courseId });
  back(`/staff/students/${studentId}`, "Enrolment added.");
}

export async function setAccountActive(fd: FormData) {
  const me = await assertCan("students.manage");
  const userId = str(fd, "userId");
  const active = str(fd, "active") === "true";
  const u = await db.query.users.findFirst({ where: eq(s.users.id, userId) });
  if (!u || u.role !== "STUDENT") fail("/staff/students", "Only student accounts can be changed here.");
  await db.update(s.users).set({ active }).where(eq(s.users.id, userId));
  await audit(me, active ? "user.activate" : "user.deactivate", "user", userId);
  back(str(fd, "returnTo"), active ? "Account re-activated." : "Account deactivated — the student can no longer sign in.");
}

export async function resendSetup(fd: FormData) {
  const me = await assertCan("students.manage");
  const userId = str(fd, "userId");
  const u = await db.query.users.findFirst({ where: eq(s.users.id, userId), with: { student: true } });
  if (!u) fail("/staff/students", "User not found");
  const link = await createSetPasswordLink(u!.id);
  await sendWelcome({ to: u!.email, name: u!.name, link, studentNumber: u!.student?.studentNumber });
  await audit(me, "user.setup_link", "user", userId);
  back(str(fd, "returnTo"), "Set-password email sent.");
}
