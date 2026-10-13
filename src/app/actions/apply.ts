"use server";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { baseApplicationSchema, checkRequired, DOC_TYPES } from "@/schemas/application";
import { getRequiredFields, getSettings } from "@/lib/settings";
import { collectUploads, countUploads, UploadError } from "@/lib/storage";
import { queueAndSend, layout, kv, p, button } from "@/lib/email";
import { newReference } from "@/lib/reference";
import { rateLimit } from "@/lib/rate-limit";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { appUrl } from "@/lib/app-url";

export type ApplyState = { ok?: boolean; reference?: string; message?: string; errors?: Record<string, string> };

const APP_URL = appUrl;

export async function submitApplication(_: ApplyState, fd: FormData): Promise<ApplyState> {
  if (fd.get("website")) return { message: "Submission blocked." };
  if (!(await rateLimit("apply", 5, 3600))) return { message: "Too many applications from this connection in the last hour. Please try again later or contact Admissions." };

  const raw = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = baseApplicationSchema.safeParse(raw);
  const counts = Object.fromEntries(Object.keys(DOC_TYPES).map((k) => [k, countUploads(fd, k)]));
  const required = await getRequiredFields();
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[i.path.join(".")] ??= i.message;
  Object.assign(errors, checkRequired(raw, required, counts));
  if (Object.keys(errors).length) return { errors, message: "Some answers need attention — check the highlighted fields." };
  const d = parsed.data!;

  const course = await db.query.courses.findFirst({ where: and(eq(s.courses.id, d.courseId), eq(s.courses.status, "OPEN")) });
  if (!course) return { errors: { courseId: "This course is not accepting applications." } };
  const intake = d.intakeId
    ? await db.query.intakes.findFirst({ where: and(eq(s.intakes.id, d.intakeId), eq(s.intakes.courseId, course.id), eq(s.intakes.status, "OPEN"), gt(s.intakes.startDate, new Date())) })
    : null;
  if (d.intakeId && !intake) return { errors: { intakeId: "That intake is no longer open — choose another." } };

  // Upload documents first (outside the transaction), then save everything atomically.
  const uploaded: { docType: string; key: string; fileName: string; mimeType: string; size: number }[] = [];
  try {
    for (const docType of Object.keys(DOC_TYPES))
      for (const u of await collectUploads(fd, docType, "applications", "document", 3)) uploaded.push({ docType, ...u });
  } catch (e) {
    if (e instanceof UploadError) return { errors: { documents: e.message }, message: e.message };
    throw e;
  }

  const adId = (await cookies()).get("guvtc_ad")?.value;
  const src = (await cookies()).get("guvtc_src")?.value;
  let reference = "";
  const app = await db.transaction(async (tx) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      reference = newReference("GUV");
      const exists = await tx.query.applications.findFirst({ where: eq(s.applications.reference, reference), columns: { id: true } });
      if (!exists) break;
    }
    const validAd = adId ? await tx.query.advertisements.findFirst({ where: eq(s.advertisements.id, adId), columns: { id: true } }) : null;
    const [row] = await tx.insert(s.applications).values({
      reference, courseId: course.id, intakeId: intake?.id ?? null, adId: validAd?.id ?? null, campaignSource: src ?? null,
      firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone,
      address: d.address || null, dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null, gender: d.gender || null,
      nationalId: d.nationalId || null, deliveryMode: d.deliveryMode || null, highestQualification: d.highestQualification || null,
      results: d.results || null, priorTraining: d.priorTraining || null, experience: d.experience || null,
      accessibility: d.accessibility || null, emergencyName: d.emergencyName || null, emergencyPhone: d.emergencyPhone || null,
      consent: true,
    }).returning();
    if (uploaded.length)
      await tx.insert(s.applicationDocuments).values(uploaded.map((u) => ({
        applicationId: row.id, docType: u.docType, fileName: u.fileName, storageKey: u.key, mimeType: u.mimeType, size: u.size,
      })));
    await tx.insert(s.applicationEvents).values({ applicationId: row.id, toStatus: "SUBMITTED", actorName: "Applicant" });
    await tx.insert(s.auditLogs).values({ actorName: `Applicant ${d.email}`, action: "application.submit", entity: "application", entityId: row.id, meta: { reference } });
    return row;
  });

  // Emails go out from the server and are logged; failures are retried by the job runner.
  const settings = await getSettings();
  const rows: [string, string][] = [
    ["Reference", reference], ["Course", course.name],
    ["Intake", intake ? `${intake.name} (starts ${fmtDate(intake.startDate)})` : "Next available intake"],
    ["Submitted", fmtDateTime(app.submittedAt)],
  ];
  await queueAndSend({
    to: d.email,
    subject: `Application received — ${reference}`,
    html: layout(`Thank you, ${d.firstName}`,
      p(`We have received your application to study ${course.name} at ${settings.institution_name}.`) + kv(rows) +
      p("What happens next: an admissions officer will review your application and documents. If anything is missing we will email you. You will receive the decision and enrolment instructions by email.") +
      button("Track your application", `${APP_URL()}/apply/track?ref=${reference}`) +
      p(`Keep your reference number. Questions? Reply to this email or call ${settings.contact_phone}.`)),
    text: `Thank you ${d.firstName}. We received your application for ${course.name}.\nReference: ${reference}\nTrack it at ${APP_URL()}/apply/track?ref=${reference}`,
    relatedType: "application", relatedId: app.id,
  });
  await queueAndSend({
    to: settings.admissions_email,
    subject: `New application ${reference}: ${course.name} — ${d.firstName} ${d.lastName}`,
    html: layout("New online application",
      kv([...rows, ["Applicant", `${d.firstName} ${d.lastName}`], ["Email", d.email], ["Phone", d.phone], ["Documents", String(uploaded.length)]]) +
      button("Review in the admissions dashboard", `${APP_URL()}/staff/admissions/${app.id}`)),
    text: `New application ${reference} for ${course.name} from ${d.firstName} ${d.lastName} (${d.email}, ${d.phone}). Review: ${APP_URL()}/staff/admissions/${app.id}`,
    relatedType: "application", relatedId: app.id,
  });

  return { ok: true, reference };
}

// ── Public status tracking: reference + email must match.
export type TrackState = { app?: { reference: string; course: string; intake: string | null; status: string; submittedAt: string; firstName: string; note: string | null; events: { to: string; at: string }[] }; message?: string; uploaded?: boolean };

async function findForApplicant(reference: string, email: string) {
  return db.query.applications.findFirst({
    where: and(eq(s.applications.reference, reference.trim().toUpperCase()), eq(s.applications.email, email.trim().toLowerCase())),
    with: { course: true, intake: true, events: { orderBy: (e, { asc }) => asc(e.createdAt) } },
  });
}

export async function trackApplication(_: TrackState, fd: FormData): Promise<TrackState> {
  if (!(await rateLimit("track", 20, 600))) return { message: "Too many attempts. Try again in 10 minutes." };
  const app = await findForApplicant(String(fd.get("reference") ?? ""), String(fd.get("email") ?? ""));
  if (!app) return { message: "We could not find an application with that reference and email address. Check both and try again." };
  const lastNote = [...app.events].reverse().find((e) => e.toStatus === "CORRECTIONS_REQUESTED")?.note ?? null;
  return {
    app: {
      reference: app.reference, course: app.course.name, intake: app.intake?.name ?? null, status: app.status,
      submittedAt: fmtDateTime(app.submittedAt), firstName: app.firstName,
      note: app.status === "CORRECTIONS_REQUESTED" ? lastNote : null,
      events: app.events.map((e) => ({ to: e.toStatus, at: fmtDateTime(e.createdAt) })),
    },
  };
}

/** When Admissions asks for more information, the applicant can upload documents and a reply. */
export async function respondToCorrections(state: TrackState, fd: FormData): Promise<TrackState> {
  if (!(await rateLimit("track-upload", 5, 600))) return { ...state, message: "Too many attempts. Try again later." };
  const app = await findForApplicant(String(fd.get("reference") ?? ""), String(fd.get("email") ?? ""));
  if (!app || app.status !== "CORRECTIONS_REQUESTED") return { ...state, message: "This application is not waiting for more information." };
  const reply = String(fd.get("reply") ?? "").trim().slice(0, 2000);
  const count = countUploads(fd, "files");
  if (!reply && count === 0) return { ...state, message: "Add a message or at least one document." };
  let list: Awaited<ReturnType<typeof collectUploads>> = [];
  try {
    list = await collectUploads(fd, "files", "applications", "document", 4);
    for (const u of list)
      await db.insert(s.applicationDocuments).values({ applicationId: app.id, docType: "doc_other", fileName: u.fileName, storageKey: u.key, mimeType: u.mimeType, size: u.size });
  } catch (e) {
    if (e instanceof UploadError) return { ...state, message: e.message };
    throw e;
  }
  await db.update(s.applications).set({ status: "UNDER_REVIEW", updatedAt: new Date() }).where(eq(s.applications.id, app.id));
  await db.insert(s.applicationEvents).values({ applicationId: app.id, fromStatus: "CORRECTIONS_REQUESTED", toStatus: "UNDER_REVIEW", actorName: "Applicant", note: reply || `Uploaded ${list.length} document(s)` });
  const settings = await getSettings();
  await queueAndSend({
    to: settings.admissions_email, subject: `Applicant responded: ${app.reference}`,
    html: layout("Applicant provided more information", kv([["Reference", app.reference], ["Applicant", `${app.firstName} ${app.lastName}`], ["Documents added", String(list.length)]]) + (reply ? p(reply) : "") + button("Open application", `${APP_URL()}/staff/admissions/${app.id}`)),
    text: `${app.firstName} ${app.lastName} responded on ${app.reference}. ${reply}`,
    relatedType: "application", relatedId: app.id,
  });
  const refreshed = await trackApplication({}, fd);
  return { ...refreshed, uploaded: true };
}
