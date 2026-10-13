import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Badge, StatusBadge, Notice } from "@/components/ui/ui";
import { Flash } from "@/components/staff/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateApplicationStatus, enrolApplicant, setDocumentStatus } from "@/app/actions/staff/admissions";
import { signedUrl } from "@/lib/storage";
import { DOC_TYPES } from "@/schemas/application";
import { DELIVERY_LABELS, fmtDate, fmtDateTime } from "@/lib/utils";
import { audit } from "@/lib/audit";

export const metadata = { title: "Application" };

export default async function ApplicationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const me = await requireStaff("applications.view");
  const { id } = await params;
  const app = await db.query.applications.findFirst({
    where: eq(s.applications.id, id),
    with: { course: { with: { classGroups: true } }, intake: true, ad: true, student: true, documents: true, events: { orderBy: asc(s.applicationEvents.createdAt) } },
  });
  if (!app) notFound();
  await audit(me, "application.view", "application", id); // access to identity documents is logged
  const decide = can(me.role, "applications.decide");
  const enrol = can(me.role, "students.manage");
  const rows: [string, string | null | undefined][] = [
    ["Email", app.email], ["Phone", app.phone], ["Address", app.address], ["Date of birth", app.dateOfBirth ? fmtDate(app.dateOfBirth) : null],
    ["Gender", app.gender], ["National ID / passport", app.nationalId], ["Delivery mode", app.deliveryMode ? DELIVERY_LABELS[app.deliveryMode] : null],
    ["Highest qualification", app.highestQualification], ["Results", app.results], ["Prior training", app.priorTraining], ["Experience", app.experience],
    ["Support needs", app.accessibility], ["Emergency contact", [app.emergencyName, app.emergencyPhone].filter(Boolean).join(", ")],
    ["Source", app.ad ? `Advert: ${app.ad.title}` : app.campaignSource ?? "Direct"],
  ];
  return (
    <>
      <Link href="/staff/admissions" className="mb-3 inline-block text-sm underline">All applications</Link>
      <PortalTitle title={`${app.firstName} ${app.lastName}`} lead={<span className="flex flex-wrap items-center gap-2"><StatusBadge status={app.status} /> {app.reference} · {app.course.name} · {app.intake?.name ?? "next available intake"} · submitted {fmtDateTime(app.submittedAt)}</span>} />
      <Flash searchParams={searchParams} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="panel">
            <h2 className="border-b border-line px-5 py-4 font-display text-xl font-semibold">Application details</h2>
            <dl className="divide-y divide-line">
              {rows.map(([k, v]) => <div key={k} className="grid gap-1 px-5 py-2.5 text-sm sm:grid-cols-[190px_1fr]"><dt className="text-slate">{k}</dt><dd className="whitespace-pre-line">{v || "—"}</dd></div>)}
            </dl>
          </section>
          <section className="panel">
            <h2 className="border-b border-line px-5 py-4 font-display text-xl font-semibold">Documents</h2>
            <ul className="divide-y divide-line">
              {app.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <span>
                    <a href={signedUrl(d.storageKey, 10)} target="_blank" rel="noopener" className="font-medium underline">{d.fileName}</a>
                    <span className="block text-xs text-slate">{DOC_TYPES[d.docType as keyof typeof DOC_TYPES] ?? d.docType} · {(d.size / 1024).toFixed(0)} KB · {fmtDateTime(d.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={d.reviewStatus === "VERIFIED" ? "success" : d.reviewStatus === "REJECTED" ? "danger" : "neutral"}>{d.reviewStatus.toLowerCase()}</Badge>
                    {decide && ["VERIFIED", "REJECTED"].map((st) => (
                      <form key={st} action={setDocumentStatus}><input type="hidden" name="docId" value={d.id} /><input type="hidden" name="status" value={st} /><button className="btn btn-outline btn-sm">{st === "VERIFIED" ? "Verify" : "Reject"}</button></form>
                    ))}
                  </span>
                </li>
              ))}
              {app.documents.length === 0 && <li className="px-5 py-4 text-sm text-slate">No documents uploaded.</li>}
            </ul>
            <p className="border-t border-line px-5 py-2 text-xs text-slate">Download links expire after 10 minutes. Opening this page is recorded in the audit log.</p>
          </section>
        </div>
        <div className="space-y-6">
          {decide && app.status !== "ENROLLED" && (
            <section className="panel p-5">
              <h2 className="font-display text-xl font-semibold">Record a decision</h2>
              <form action={updateApplicationStatus} className="mt-4 grid gap-4">
                <input type="hidden" name="id" value={app.id} />
                <div><label htmlFor="status" className="field-label">New status</label>
                  <select id="status" name="status" className="input" defaultValue={app.status === "SUBMITTED" ? "UNDER_REVIEW" : app.status}>
                    <option value="UNDER_REVIEW">Under review</option><option value="CORRECTIONS_REQUESTED">Request more information</option>
                    <option value="ACCEPTED">Accept — send offer</option><option value="WAITLISTED">Waitlist</option><option value="REJECTED">Reject</option><option value="WITHDRAWN">Withdrawn</option>
                  </select></div>
                <div><label htmlFor="note" className="field-label">Message to applicant</label><textarea id="note" name="note" className="input" placeholder="Required when requesting more information. Included in the email." /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked className="accent-navy" />Email the applicant</label>
                <SubmitButton pending="Saving…">Save decision</SubmitButton>
              </form>
            </section>
          )}
          {enrol && app.status === "ACCEPTED" && (
            <section className="panel border-success p-5">
              <h2 className="font-display text-xl font-semibold">Enrol this applicant</h2>
              <p className="mt-1 text-sm text-slate">Creates the student record and eLearning account, adds the enrolment and emails a set-password link.</p>
              <form action={enrolApplicant} className="mt-4 grid gap-4">
                <input type="hidden" name="id" value={app.id} />
                <div><label htmlFor="classGroupId" className="field-label">Class group</label>
                  <select id="classGroupId" name="classGroupId" className="input"><option value="">Assign later</option>{app.course.classGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                <SubmitButton variant="gold" pending="Enrolling…">Enrol student</SubmitButton>
              </form>
            </section>
          )}
          {app.student && <Notice tone="success">Enrolled as <Link href={`/staff/students/${app.student.id}`} className="font-semibold underline">{app.student.studentNumber}</Link>.</Notice>}
          <section className="panel p-5">
            <h2 className="font-display text-xl font-semibold">History</h2>
            <ol className="mt-4 space-y-4 border-l-2 border-line pl-5">
              {app.events.map((e) => (
                <li key={e.id}>
                  <StatusBadge status={e.toStatus} />
                  <p className="mt-1 text-xs text-slate">{fmtDateTime(e.createdAt)} · {e.actorName ?? "System"}</p>
                  {e.note && <p className="mt-1 text-sm">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
