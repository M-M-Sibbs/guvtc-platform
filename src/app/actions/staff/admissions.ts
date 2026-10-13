"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { back, fail, optStr, str } from "@/lib/action-helpers";
import { queueAndSend, layout, kv, p, button } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { nextStudentNumber, randomPasswordHash, createSetPasswordLink, sendWelcome } from "@/lib/accounts";
import { fmtDate } from "@/lib/utils";
import type { ApplicationStatus } from "@/db/schema";
import { appUrl } from "@/lib/app-url";

const DECISIONS: ApplicationStatus[] = ["UNDER_REVIEW", "CORRECTIONS_REQUESTED", "ACCEPTED", "WAITLISTED", "REJECTED", "WITHDRAWN"];
const APP_URL = appUrl;

/** Admission decisions are made by authorised staff; every change is logged with who made it. */
export async function updateApplicationStatus(fd: FormData) {
  const me = await assertCan("applications.decide");
  const id = str(fd, "id");
  const path = `/staff/admissions/${id}`;
  const to = str(fd, "status") as ApplicationStatus;
  const note = optStr(fd, "note");
  const notify = fd.get("notify") === "on";
  if (!DECISIONS.includes(to)) fail(path, "Choose a valid status.");
  if (to === "CORRECTIONS_REQUESTED" && !note) fail(path, "Tell the applicant what information is needed.");
  const app = await db.query.applications.findFirst({ where: eq(s.applications.id, id), with: { course: true, intake: true } });
  if (!app) fail("/staff/admissions", "Application not found");
  if (app!.status === "ENROLLED") fail(path, "This applicant is already enrolled.");

  await db.transaction(async (tx) => {
    await tx.update(s.applications).set({ status: to, decisionNote: note ?? app!.decisionNote, updatedAt: new Date() }).where(eq(s.applications.id, id));
    await tx.insert(s.applicationEvents).values({ applicationId: id, fromStatus: app!.status, toStatus: to, note, actorId: me.id, actorName: me.name });
  });
  await audit(me, "application.status", "application", id, { from: app!.status, to, note });

  if (notify && to !== "UNDER_REVIEW") {
    const settings = await getSettings();
    const msgs: Record<string, [string, string]> = {
      CORRECTIONS_REQUESTED: ["We need a little more information", "Admissions has reviewed your application and needs more information before a decision can be made."],
      ACCEPTED: ["Offer of a place", `Congratulations! You have been offered a place on ${app!.course.name}${app!.intake ? `, ${app!.intake.name} (starting ${fmtDate(app!.intake.startDate)})` : ""}. Enrolment instructions are below.`],
      WAITLISTED: ["You are on the waiting list", `Thank you for applying for ${app!.course.name}. The intake is currently full and you have been placed on the waiting list. We will contact you if a place becomes available.`],
      REJECTED: ["Your application", `Thank you for applying for ${app!.course.name}. Unfortunately we are unable to offer you a place at this time.`],
      WITHDRAWN: ["Application withdrawn", "Your application has been withdrawn as requested."],
    };
    const [title, body] = msgs[to];
    await queueAndSend({
      to: app!.email, subject: `${title} — ${app!.reference}`,
      html: layout(title, p(`Dear ${app!.firstName},`) + p(body) + (note ? p(note) : "") + kv([["Reference", app!.reference], ["Course", app!.course.name]]) +
        (to === "CORRECTIONS_REQUESTED" ? button("Send the information", `${APP_URL()}/apply/track?ref=${app!.reference}`) : "") +
        p(`Questions? Contact Admissions on ${settings.contact_phone} or reply to this email.`)),
      text: `${title}\n\n${body}\n${note ?? ""}\nReference: ${app!.reference}`,
      relatedType: "application", relatedId: id,
    });
  }
  revalidatePath("/staff/admissions");
  back(path, notify && to !== "UNDER_REVIEW" ? "Status updated and applicant emailed." : "Status updated.");
}

/** Converts an accepted applicant into an enrolled student with an eLearning account (one transaction). */
export async function enrolApplicant(fd: FormData) {
  const me = await assertCan("students.manage");
  const id = str(fd, "id");
  const path = `/staff/admissions/${id}`;
  const app = await db.query.applications.findFirst({ where: eq(s.applications.id, id), with: { course: true } });
  if (!app) fail("/staff/admissions", "Application not found");
  if (app!.status !== "ACCEPTED") fail(path, "Only accepted applicants can be enrolled.");
  const classGroupId = optStr(fd, "classGroupId");

  const result = await db.transaction(async (tx) => {
    const found = await tx.query.users.findFirst({ where: eq(s.users.email, app!.email), with: { student: true } });
    if (found && found.role !== "STUDENT") throw new Error("That email belongs to a staff account. Ask the applicant for another email.");
    let student = found?.student ?? null;
    let user = found ?? null;
    let isNew = false;
    if (!user) {
      const [created] = await tx.insert(s.users).values({ email: app!.email, name: `${app!.firstName} ${app!.lastName}`, role: "STUDENT", passwordHash: await randomPasswordHash() }).returning();
      user = { ...created, student: null as never };
      isNew = true;
    }
    if (!student) {
      [student] = await tx.insert(s.students).values({
        userId: user!.id, studentNumber: await nextStudentNumber(tx), phone: app!.phone, address: app!.address,
        dateOfBirth: app!.dateOfBirth, nationalId: app!.nationalId,
        emergencyContact: [app!.emergencyName, app!.emergencyPhone].filter(Boolean).join(", ") || null,
      }).returning();
    }
    const existing = await tx.query.enrolments.findFirst({ where: and(eq(s.enrolments.studentId, student!.id), eq(s.enrolments.courseId, app!.courseId)) });
    if (!existing) await tx.insert(s.enrolments).values({ studentId: student!.id, courseId: app!.courseId, intakeId: app!.intakeId, classGroupId });
    await tx.update(s.applications).set({ status: "ENROLLED", studentId: student!.id, updatedAt: new Date() }).where(eq(s.applications.id, id));
    await tx.insert(s.applicationEvents).values({ applicationId: id, fromStatus: "ACCEPTED", toStatus: "ENROLLED", actorId: me.id, actorName: me.name, note: `Student number ${student!.studentNumber}` });
    const link = isNew ? await createSetPasswordLink(user!.id, 7, tx) : null;
    return { user: user!, student: student!, link };
  }).catch((e: Error) => fail(path, e.message));

  await audit(me, "application.enrol", "application", id, { studentNumber: result.student.studentNumber });
  if (result.link) await sendWelcome({ to: result.user.email, name: result.user.name, link: result.link, studentNumber: result.student.studentNumber, course: app!.course.name });
  back(path, `Enrolled as ${result.student.studentNumber}. ${result.link ? "Account set-up email sent." : "Added to the existing student account."}`);
}

export async function setDocumentStatus(fd: FormData) {
  const me = await assertCan("applications.decide");
  const docId = str(fd, "docId");
  const status = str(fd, "status");
  if (!["VERIFIED", "REJECTED", "PENDING"].includes(status)) fail("/staff/admissions", "Invalid status");
  const [doc] = await db.update(s.applicationDocuments).set({ reviewStatus: status }).where(eq(s.applicationDocuments.id, docId)).returning();
  await audit(me, "application.document", "application", doc.applicationId, { docId, status });
  back(`/staff/admissions/${doc.applicationId}`, "Document updated.");
}
