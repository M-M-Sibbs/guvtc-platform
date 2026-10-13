import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStudent } from "@/lib/auth";
import { publishedResults } from "@/lib/student-data";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "@/components/student/print-button";
import { fmtDate, fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Result statement" };

export default async function Statement() {
  const me = await requireStudent();
  const [courses, student, settings] = await Promise.all([
    publishedResults(me.studentId),
    db.query.students.findFirst({ where: eq(s.students.id, me.studentId) }),
    getSettings(),
  ]);
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 flex justify-end"><PrintButton /></div>
      <header className="border-b-2 border-navy pb-4">
        <p className="font-display text-2xl font-semibold">{settings.institution_name}</p>
        <p className="text-sm text-slate">Statement of published results · generated {fmtDateTime(new Date())}</p>
      </header>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div><dt className="text-slate">Student</dt><dd className="font-semibold">{me.name}</dd></div>
        <div><dt className="text-slate">Student number</dt><dd className="font-semibold">{student?.studentNumber}</dd></div>
      </dl>
      {courses.map(({ course, rows, final, grade }) => (
        <section key={course.id} className="mt-6 break-inside-avoid">
          <h2 className="font-display text-lg font-semibold">{course.name}</h2>
          <table className="table-std mt-2">
            <thead><tr><th>Assessment</th><th>Weight</th><th>Mark</th><th>Published</th></tr></thead>
            <tbody>
              {rows.map(({ assessment: a, result: r }) => (
                <tr key={a.id}><td>{a.title}</td><td>{a.weight}%</td><td>{r ? (r.status === "RECORDED" ? `${r.marks}/${a.maxMarks}` : r.status) : "—"}</td><td>{fmtDate(a.publishedAt)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-sm">Final: <strong>{final != null ? `${final}% — ${grade?.grade}` : "Pending"}</strong></p>
        </section>
      ))}
      <p className="mt-10 text-xs text-slate">This statement lists results published to the student portal. An official transcript or certificate is issued by the centre's examinations office.</p>
    </div>
  );
}
