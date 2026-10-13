import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStudent } from "@/lib/auth";
import { accessibleCourseIds } from "@/lib/student-data";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Icon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/ui";
import { fmtDateTime } from "@/lib/utils";

const TYPE = { LIVE: { icon: Icon.Video, label: "Live class" }, RECORDED: { icon: Icon.Play, label: "Recorded lesson" }, NOTES: { icon: Icon.File, label: "Notes" } };

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireStudent();
  if (!(await accessibleCourseIds(me.studentId)).includes(id)) notFound();
  const course = await db.query.courses.findFirst({
    where: eq(s.courses.id, id),
    with: {
      modules: { orderBy: asc(s.modules.order), with: { lessons: { where: eq(s.lessons.published, true), orderBy: asc(s.lessons.order) } } },
      quizzes: { where: eq(s.quizzes.published, true), with: { questions: { columns: { id: true } }, attempts: { where: eq(s.quizAttempts.studentId, me.studentId), orderBy: desc(s.quizAttempts.completedAt) } } },
    },
  });
  if (!course) notFound();
  const done = new Set((await db.select({ id: s.lessonProgress.lessonId }).from(s.lessonProgress).where(eq(s.lessonProgress.studentId, me.studentId))).map((r) => r.id));
  const assignments = await db.query.assignments.findMany({ where: and(eq(s.assignments.courseId, id), eq(s.assignments.published, true)), orderBy: asc(s.assignments.dueAt) });

  return (
    <>
      <Link href="/student/courses" className="mb-4 inline-flex items-center gap-1 text-sm underline"><Icon.Back size={14} />My courses</Link>
      <PortalTitle title={course.name} lead={course.summary} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {course.modules.map((m, mi) => {
            const total = m.lessons.length;
            const complete = m.lessons.filter((l) => done.has(l.id)).length;
            return (
              <section key={m.id} className="panel overflow-hidden">
                <header className="border-b border-line bg-mist-2 px-5 py-4">
                  <p className="text-xs text-slate">Module {mi + 1} · {complete}/{total} complete</p>
                  <h2 className="font-display text-xl font-semibold">{m.title}</h2>
                  {m.objectives && <p className="mt-1 text-sm text-slate">{m.objectives}</p>}
                </header>
                <ol className="divide-y divide-line">
                  {m.lessons.map((l) => {
                    const T = TYPE[l.type];
                    return (
                      <li key={l.id}>
                        <Link href={`/student/lessons/${l.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-mist-2">
                          <T.icon className="shrink-0 text-slate" />
                          <span className="flex-1">
                            <span className="block font-medium">{l.title}</span>
                            <span className="text-xs text-slate">{T.label}{l.type === "LIVE" && l.startsAt ? ` · ${fmtDateTime(l.startsAt)}` : l.durationMins ? ` · ${l.durationMins} min` : ""}</span>
                          </span>
                          {done.has(l.id) ? <Icon.Check className="text-success" aria-label="Completed" /> : null}
                        </Link>
                      </li>
                    );
                  })}
                  {m.lessons.length === 0 && <li className="px-5 py-4 text-sm text-slate">Lessons will be added soon.</li>}
                </ol>
              </section>
            );
          })}
          {course.modules.length === 0 && <p className="text-slate">Your lecturer has not published any modules yet.</p>}
        </div>
        <aside className="space-y-5">
          <section className="panel p-5">
            <h2 className="font-display text-lg font-semibold">Assignments</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {assignments.map((a) => <li key={a.id}><Link href={`/student/assignments#a-${a.id}`} className="font-medium underline-offset-4 hover:underline">{a.title}</Link>{a.practical && <Badge tone="gold" className="ml-2">Practical</Badge>}<p className="text-slate">Due {fmtDateTime(a.dueAt)}</p></li>)}
              {assignments.length === 0 && <li className="text-slate">None yet.</li>}
            </ul>
          </section>
          <section className="panel p-5">
            <h2 className="font-display text-lg font-semibold">Quizzes</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {course.quizzes.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3">
                  <span><span className="font-medium">{q.title}</span><span className="block text-slate">{q.questions.length} questions{q.attempts[0] && ` · best ${Math.max(...q.attempts.map((a) => a.score))}/${q.attempts[0].total}`}</span></span>
                  <Link href={`/student/quizzes/${q.id}`} className="btn btn-outline btn-sm">{q.attempts.length ? "Retake" : "Start"}</Link>
                </li>
              ))}
              {course.quizzes.length === 0 && <li className="text-slate">None yet.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
