import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { teachableCourseIds } from "@/lib/teaching";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { Badge, Notice } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveMarks, approveAssessment, publishAssessment } from "@/app/actions/staff/results";
import { gradeFor } from "@/lib/grading";
import { fmtDateTime, titleCase } from "@/lib/utils";

export default async function MarksEntry({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const me = await requireStaff("marks.enter");
  const { id } = await params;
  const a = await db.query.assessments.findFirst({ where: eq(s.assessments.id, id), with: { course: true } });
  if (!a) notFound();
  const ids = await teachableCourseIds(me);
  if (ids !== "all" && !ids.includes(a.courseId)) redirect("/staff/results?error=Not%20your%20course");
  const roster = await db.select({ id: s.students.id, number: s.students.studentNumber, name: s.users.name })
    .from(s.enrolments).innerJoin(s.students, eq(s.enrolments.studentId, s.students.id)).innerJoin(s.users, eq(s.students.userId, s.users.id))
    .where(and(eq(s.enrolments.courseId, a.courseId), inArray(s.enrolments.status, ["ACTIVE", "COMPLETED"]))).orderBy(asc(s.users.name));
  const res = await db.select().from(s.results).where(eq(s.results.assessmentId, id));
  const isExams = can(me.role, "results.approve");
  const locked = !!a.approvedAt;
  const editable = !locked || isExams;
  return (
    <>
      <Link href={`/staff/results?course=${a.courseId}`} className="mb-3 inline-block text-sm underline">{a.course.name}</Link>
      <PortalTitle title={a.title} lead={`${titleCase(a.type)} · weight ${a.weight}% · out of ${a.maxMarks}`}>
        {a.publishedAt ? <Badge tone="success">Published {fmtDateTime(a.publishedAt)}</Badge> : a.approvedAt ? <Badge tone="navy">Approved by {a.approvedBy}</Badge> : <Badge>Entering marks</Badge>}
      </PortalTitle>
      <Flash searchParams={searchParams} />
      {locked && !isExams && <div className="mb-4"><Notice tone="gold">Approved marks are locked. Contact the examinations office for corrections.</Notice></div>}
      <form action={saveMarks} className="panel overflow-x-auto">
        <input type="hidden" name="assessmentId" value={a.id} />
        <table className="table-std">
          <thead><tr><th>Student</th><th>Mark /{a.maxMarks}</th><th>Status</th><th>%</th><th>Comment</th></tr></thead>
          <tbody>
            {roster.map((r) => {
              const cur = res.find((x) => x.studentId === r.id);
              const pct = cur?.marks != null ? Math.round((cur.marks / a.maxMarks) * 100) : null;
              return (
                <tr key={r.id}>
                  <td>{r.name}<span className="block text-xs text-slate">{r.number}</span><input type="hidden" name="studentId" value={r.id} /></td>
                  <td><input name={`m_${r.id}`} type="number" step="0.5" min={0} max={a.maxMarks} defaultValue={cur?.marks ?? ""} disabled={!editable} className="input !w-24" aria-label={`Mark for ${r.name}`} /></td>
                  <td><select name={`st_${r.id}`} defaultValue={cur?.status ?? "RECORDED"} disabled={!editable} className="input !w-36"><option value="RECORDED">Recorded</option><option value="ABSENT">Absent</option><option value="INCOMPLETE">Incomplete</option><option value="WITHHELD">Withheld</option></select></td>
                  <td className="tabular-nums">{pct != null ? `${pct}% · ${gradeFor(pct).grade}` : "—"}</td>
                  <td><input name={`c_${r.id}`} defaultValue={cur?.comment ?? ""} disabled={!editable} className="input" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {editable && (
          <div className="flex flex-wrap items-end gap-3 border-t border-line p-4">
            {locked && <label className="field-label flex-1">Reason for correction (required)<input name="reason" className="input mt-1" /></label>}
            <SubmitButton>{locked ? "Save correction" : "Save marks"}</SubmitButton>
          </div>
        )}
      </form>
      {isExams && (
        <section className="panel mt-6 flex flex-wrap items-start gap-3 p-5">
          {!a.approvedAt && <form action={approveAssessment}><input type="hidden" name="assessmentId" value={a.id} /><SubmitButton>Approve & lock marks</SubmitButton></form>}
          {a.approvedAt && !a.publishedAt && (
            <>
              <form action={approveAssessment}><input type="hidden" name="assessmentId" value={a.id} /><input type="hidden" name="undo" value="1" /><button className="btn btn-outline">Reopen for editing</button></form>
              {can(me.role, "results.publish") && (
                <form action={publishAssessment} className="flex items-center gap-3"><input type="hidden" name="assessmentId" value={a.id} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked className="accent-navy" />Email students</label>
                  <SubmitButton variant="gold">Publish to students</SubmitButton></form>
              )}
            </>
          )}
          {a.publishedAt && can(me.role, "results.publish") && (
            <form action={publishAssessment} className="flex flex-wrap items-center gap-2"><input type="hidden" name="assessmentId" value={a.id} /><input type="hidden" name="withdraw" value="1" />
              <input name="reason" className="input !w-72" placeholder="Reason for withdrawal" /><button className="btn btn-danger btn-sm">Withdraw publication</button></form>
          )}
        </section>
      )}
    </>
  );
}
