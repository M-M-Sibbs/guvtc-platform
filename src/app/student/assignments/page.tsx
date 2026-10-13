import { and, asc, eq, inArray, desc } from "drizzle-orm";
import Link from "next/link";
import { db, schema as s } from "@/db";
import { requireStudent } from "@/lib/auth";
import { accessibleCourseIds } from "@/lib/student-data";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Badge } from "@/components/ui/ui";
import { SubmissionForm } from "@/components/student/submission-form";
import { signedUrl, uploadMode } from "@/lib/storage";
import { fmtDateTime } from "@/lib/utils";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Notes & tasks" };

export default async function AssignmentsPage() {
  const me = await requireStudent();
  const ids = await accessibleCourseIds(me.studentId);
  const [items, subs, notes] = ids.length ? await Promise.all([
    db.query.assignments.findMany({ where: and(inArray(s.assignments.courseId, ids), eq(s.assignments.published, true)), with: { course: true }, orderBy: asc(s.assignments.dueAt) }),
    db.select().from(s.submissions).where(eq(s.submissions.studentId, me.studentId)),
    db.select({ l: s.lessons, course: s.courses.name }).from(s.lessons).innerJoin(s.modules, eq(s.lessons.moduleId, s.modules.id)).innerJoin(s.courses, eq(s.modules.courseId, s.courses.id))
      .where(and(inArray(s.courses.id, ids), eq(s.lessons.type, "NOTES"), eq(s.lessons.published, true))).orderBy(desc(s.lessons.createdAt)),
  ]) : [[], [], []];
  return (
    <>
      <PortalTitle title="Notes & tasks" lead="Learning resources and assignments for your courses." />
      <section className="panel mb-8 overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 font-display text-xl font-semibold">Notes and resources</h2>
        <ul className="divide-y divide-line">
          {notes.map(({ l, course }) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <span><Link href={`/student/lessons/${l.id}`} className="font-medium hover:underline">{l.title}</Link><span className="block text-sm text-slate">{course}</span></span>
              {l.fileKey && <a href={signedUrl(l.fileKey, 30)} className="btn btn-outline btn-sm"><Icon.Download size={16} />{l.fileName}</a>}
            </li>
          ))}
          {notes.length === 0 && <li className="px-5 py-5 text-slate">No notes published yet.</li>}
        </ul>
      </section>
      <h2 className="mb-4 font-display text-2xl font-semibold">Assignments</h2>
      <div className="space-y-5">
        {items.map((a) => {
          const sub = subs.find((x) => x.assignmentId === a.id);
          const overdue = !sub && a.dueAt < new Date();
          return (
            <article key={a.id} id={`a-${a.id}`} className="panel scroll-mt-6 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate">{a.course.name}</p>
                  <h3 className="font-display text-xl font-semibold">{a.title} {a.practical && <Badge tone="gold">Practical evidence</Badge>}</h3>
                  <p className="text-sm text-slate">Due {fmtDateTime(a.dueAt)} · {a.maxMarks} marks</p>
                </div>
                {sub?.gradedAt ? <Badge tone="success">Marked: {sub.marks}/{a.maxMarks}</Badge> : sub ? <Badge tone="navy">Submitted</Badge> : overdue ? <Badge tone="danger">Overdue</Badge> : <Badge>Not submitted</Badge>}
              </div>
              <p className="mt-4 max-w-3xl whitespace-pre-line">{a.instructions}</p>
              {sub?.gradedAt && sub.feedback && (
                <div className="mt-4 rounded-md border-l-4 border-gold bg-mist-2 p-4"><p className="text-sm font-semibold">Lecturer feedback</p><p className="mt-1">{sub.feedback}</p></div>
              )}
              {sub && <p className="mt-3 text-sm text-slate">Your submission: {fmtDateTime(sub.submittedAt)}{sub.fileName && sub.fileKey && <> · <a className="underline" href={signedUrl(sub.fileKey)}>{sub.fileName}</a></>}</p>}
              {!sub?.gradedAt && <SubmissionForm assignmentId={a.id} practical={a.practical} existingText={sub?.text} uploadMode={uploadMode()} />}
            </article>
          );
        })}
        {items.length === 0 && <p className="text-slate">No assignments yet.</p>}
      </div>
    </>
  );
}
