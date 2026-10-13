import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStudent } from "@/lib/auth";
import { courseProgress } from "@/lib/student-data";
import { PortalTitle } from "@/components/portal/portal-shell";
import { StatusBadge } from "@/components/ui/ui";

export const metadata = { title: "My courses" };

export default async function MyCourses() {
  const me = await requireStudent();
  const enrolments = await db.query.enrolments.findMany({ where: eq(s.enrolments.studentId, me.studentId), with: { course: { with: { category: true } }, intake: true, classGroup: { with: { lecturer: { with: { user: true } } } } } });
  const progress = await courseProgress(me.studentId, enrolments.map((e) => e.courseId));
  return (
    <>
      <PortalTitle title="My courses" lead="Enrolled programmes and learning modules." />
      <div className="grid gap-4 md:grid-cols-2">
        {enrolments.map((e) => {
          const p = progress[e.courseId] ?? { done: 0, total: 0 };
          const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
          const canOpen = e.status === "ACTIVE" || e.status === "COMPLETED";
          return (
            <article key={e.id} className="panel p-6">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm text-slate">{e.course.category.name}</p><h2 className="font-display text-2xl font-semibold">{e.course.name}</h2></div>
                <StatusBadge status={e.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-slate">Intake</dt><dd>{e.intake?.name ?? "—"}</dd></div>
                <div><dt className="text-slate">Class</dt><dd>{e.classGroup?.name ?? "—"}</dd></div>
                <div><dt className="text-slate">Lecturer</dt><dd>{e.classGroup?.lecturer?.user.name ?? "—"}</dd></div>
                <div><dt className="text-slate">Progress</dt><dd>{pct}%</dd></div>
              </dl>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-mist"><div className="h-full bg-navy" style={{ width: `${pct}%` }} /></div>
              {canOpen && <Link href={`/student/courses/${e.courseId}`} className="btn btn-primary mt-5">Open course</Link>}
            </article>
          );
        })}
      </div>
    </>
  );
}
