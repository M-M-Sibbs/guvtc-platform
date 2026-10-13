import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { publishedResults } from "@/lib/student-data";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Badge } from "@/components/ui/ui";
import { titleCase, fmtDate } from "@/lib/utils";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "My results" };

export default async function ResultsPage() {
  const me = await requireStudent();
  const courses = await publishedResults(me.studentId);
  return (
    <>
      <PortalTitle title="My results" lead="Approved marks and feedback. Marks appear here only after the examinations office publishes them.">
        <Link href="/student/results/statement" className="btn btn-outline"><Icon.Download size={16} />Result statement</Link>
      </PortalTitle>
      <div className="space-y-6">
        {courses.map(({ course, rows, pending, final, grade }) => (
          <section key={course.id} className="panel overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h2 className="font-display text-xl font-semibold">{course.name}</h2>
              {final != null && grade ? (
                <span className="text-right"><span className="font-display text-2xl font-semibold">{final}%</span> <Badge tone={final >= 50 ? "success" : "danger"}>{grade.grade}</Badge></span>
              ) : <Badge>Final grade after all assessments are published</Badge>}
            </header>
            <div className="overflow-x-auto">
              <table className="table-std">
                <thead><tr><th>Assessment</th><th>Type</th><th>Weight</th><th>Mark</th><th>Lecturer comment</th></tr></thead>
                <tbody>
                  {rows.map(({ assessment: a, result: r }) => (
                    <tr key={a.id}>
                      <td className="font-medium">{a.title}<span className="block text-xs text-slate">Published {fmtDate(a.publishedAt)}</span></td>
                      <td>{titleCase(a.type)}</td>
                      <td>{a.weight}%</td>
                      <td>{!r ? "—" : r.status === "RECORDED" ? <strong>{r.marks}/{a.maxMarks}</strong> : <Badge tone="warn">{titleCase(r.status)}</Badge>}</td>
                      <td className="text-slate">{r?.comment ?? ""}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={5} className="text-slate">No marks published yet.</td></tr>}
                </tbody>
              </table>
            </div>
            {pending > 0 && <p className="border-t border-line px-5 py-3 text-sm text-slate">{pending} assessment{pending === 1 ? "" : "s"} not yet published.</p>}
          </section>
        ))}
        {courses.length === 0 && <p className="text-slate">You have no enrolled courses.</p>}
      </div>
    </>
  );
}
