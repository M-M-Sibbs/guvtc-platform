import Link from "next/link";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { teachableCourseIds } from "@/lib/teaching";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { Badge, Notice } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { createAssessment } from "@/app/actions/staff/results";
import { fmtDate, titleCase } from "@/lib/utils";

export const metadata = { title: "Assessments & results" };

export default async function ResultsAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireStaff("marks.enter");
  const sp = await searchParams;
  const ids = await teachableCourseIds(me);
  const courses = await db.query.courses.findMany({ where: ids === "all" ? undefined : inArray(s.courses.id, ids.length ? ids : ["-"]), orderBy: asc(s.courses.name) });
  const courseId = sp.course ?? courses[0]?.id;
  const course = courses.find((c) => c.id === courseId);
  const assessments = course ? await db.select({
    a: s.assessments,
    entered: sql<number>`(SELECT count(*)::int FROM results r WHERE r.assessment_id = ${s.assessments.id})`,
    students: sql<number>`(SELECT count(*)::int FROM enrolments e WHERE e.course_id = ${s.assessments.courseId} AND e.status IN ('ACTIVE','COMPLETED'))`,
  }).from(s.assessments).where(eq(s.assessments.courseId, course.id)).orderBy(asc(s.assessments.scheduledAt)) : [];
  const totalWeight = assessments.reduce((t, x) => t + x.a.weight, 0);
  return (
    <>
      <PortalTitle title="Assessments & results" lead="Lecturers enter marks → examinations office approves (locks) → publishes to students. Corrections after approval are logged with a reason." />
      <Flash searchParams={searchParams} />
      <form className="mb-6 flex gap-2"><select name="course" defaultValue={courseId} className="input max-w-sm">{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="btn btn-outline">Show</button></form>
      {course && (
        <>
          {totalWeight !== 100 && <div className="mb-4"><Notice tone="warn">Assessment weights for this course total {totalWeight}%. Final grades are calculated only when weights total 100% and every assessment is published.</Notice></div>}
          <div className="panel overflow-x-auto">
            <table className="table-std">
              <thead><tr><th>Assessment</th><th>Type</th><th>Weight</th><th>Date</th><th>Marks entered</th><th>Stage</th></tr></thead>
              <tbody>
                {assessments.map(({ a, entered, students }) => (
                  <tr key={a.id}>
                    <td><Link href={`/staff/results/${a.id}`} className="font-semibold hover:underline">{a.title}</Link></td>
                    <td>{titleCase(a.type)}</td><td>{a.weight}%</td><td>{fmtDate(a.scheduledAt)}</td>
                    <td>{entered}/{students}</td>
                    <td>{a.publishedAt ? <Badge tone="success">Published</Badge> : a.approvedAt ? <Badge tone="navy">Approved</Badge> : <Badge>Entering marks</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {can(me.role, "results.approve") && (
            <section className="panel mt-6 p-5">
              <h2 className="font-display text-lg font-semibold">Add an assessment</h2>
              <form action={createAssessment} className="mt-3 grid gap-3 sm:grid-cols-6 sm:items-end">
                <input type="hidden" name="courseId" value={course.id} />
                <div className="sm:col-span-2"><label className="field-label">Title</label><input name="title" className="input" /></div>
                <div><label className="field-label">Type</label><select name="type" className="input"><option value="CONTINUOUS">Continuous</option><option value="PRACTICAL">Practical</option><option value="FINAL_EXAM">Final exam</option></select></div>
                <div><label className="field-label">Weight %</label><input name="weight" type="number" className="input" /></div>
                <div><label className="field-label">Out of</label><input name="maxMarks" type="number" defaultValue={100} className="input" /></div>
                <div><label className="field-label">Date</label><input name="scheduledAt" type="date" className="input" /></div>
                <div><SubmitButton>Add</SubmitButton></div>
              </form>
            </section>
          )}
        </>
      )}
    </>
  );
}
