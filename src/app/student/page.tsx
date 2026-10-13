import Link from "next/link";
import { and, asc, desc, eq, gt, inArray, isNull, or, notExists } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStudent } from "@/lib/auth";
import { accessibleCourseIds, courseProgress, publishedResults, upcomingLive, liveWindow } from "@/lib/student-data";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Icon } from "@/components/ui/icons";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { JoinLiveButton } from "@/components/student/join-live";

export default async function StudentDashboard() {
  const me = await requireStudent();
  const courseIds = await accessibleCourseIds(me.studentId);
  const [enrolments, progress, live, results, due, notices, nextLesson] = await Promise.all([
    db.query.enrolments.findMany({ where: eq(s.enrolments.studentId, me.studentId), with: { course: true } }),
    courseProgress(me.studentId, courseIds),
    upcomingLive(courseIds, 3),
    publishedResults(me.studentId),
    courseIds.length ? db.select({ a: s.assignments, course: s.courses.name }).from(s.assignments).innerJoin(s.courses, eq(s.assignments.courseId, s.courses.id))
      .where(and(inArray(s.assignments.courseId, courseIds), eq(s.assignments.published, true), gt(s.assignments.dueAt, new Date()),
        notExists(db.select().from(s.submissions).where(and(eq(s.submissions.assignmentId, s.assignments.id), eq(s.submissions.studentId, me.studentId))))))
      .orderBy(asc(s.assignments.dueAt)).limit(4) : [],
    db.select().from(s.announcements).where(or(eq(s.announcements.audience, "ALL_STUDENTS"), eq(s.announcements.audience, "EVERYONE"),
      courseIds.length ? inArray(s.announcements.courseId, courseIds) : undefined)).orderBy(desc(s.announcements.publishedAt)).limit(3),
    courseIds.length ? db.select({ l: s.lessons, course: s.courses.name }).from(s.lessons).innerJoin(s.modules, eq(s.lessons.moduleId, s.modules.id)).innerJoin(s.courses, eq(s.modules.courseId, s.courses.id))
      .leftJoin(s.lessonProgress, and(eq(s.lessonProgress.lessonId, s.lessons.id), eq(s.lessonProgress.studentId, me.studentId)))
      .where(and(inArray(s.courses.id, courseIds), eq(s.lessons.published, true), isNull(s.lessonProgress.id), or(eq(s.lessons.type, "RECORDED"), eq(s.lessons.type, "NOTES"))))
      .orderBy(asc(s.modules.order), asc(s.lessons.order)).limit(1) : [],
  ]);
  const publishedCount = results.reduce((n, r) => n + r.rows.length, 0);
  const firstName = me.name.split(" ")[0];

  const tiles = [
    { href: "/student/courses", icon: Icon.Book, title: "My courses", body: `${enrolments.length} enrolled programme${enrolments.length === 1 ? "" : "s"}` },
    { href: "/student/live", icon: Icon.Video, title: "Live classes", body: live[0] ? `Next: ${fmtDate(live[0].lesson.startsAt, { weekday: "short", hour: "2-digit", minute: "2-digit" })}` : "No sessions scheduled" },
    { href: "/student/assignments", icon: Icon.File, title: "Notes & tasks", body: due.length ? `${due.length} task${due.length === 1 ? "" : "s"} due` : "Nothing due" },
    { href: "/student/results", icon: Icon.Chart, title: "My results", body: publishedCount ? `${publishedCount} published mark${publishedCount === 1 ? "" : "s"}` : "None published yet" },
  ];

  return (
    <>
      <PortalTitle title={`Welcome back, ${firstName}`} lead="Here is what needs your attention." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ href, icon: I, title, body }) => (
          <Link key={href} href={href} className="panel flex items-start gap-4 p-5 hover:border-navy">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-navy text-gold"><I /></span>
            <span><span className="block font-display text-xl font-semibold">{title}</span><span className="text-sm text-slate">{body}</span></span>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {nextLesson[0] && (
            <section className="panel p-6">
              <h2 className="text-sm font-semibold text-slate">Continue learning</h2>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-semibold">{nextLesson[0].l.title}</p>
                  <p className="text-sm text-slate">{nextLesson[0].course} · {nextLesson[0].l.type === "RECORDED" ? "Recorded lesson" : "Notes"}</p>
                </div>
                <Link href={`/student/lessons/${nextLesson[0].l.id}`} className="btn btn-primary"><Icon.Play size={18} />Resume</Link>
              </div>
            </section>
          )}
          <section className="panel p-6">
            <h2 className="font-display text-xl font-semibold">Course progress</h2>
            <ul className="mt-4 space-y-5">
              {enrolments.map((e) => {
                const p = progress[e.courseId] ?? { done: 0, total: 0 };
                const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
                return (
                  <li key={e.id}>
                    <div className="flex justify-between text-sm"><Link href={`/student/courses/${e.courseId}`} className="font-semibold hover:underline">{e.course.name}</Link><span className="text-slate">{p.done}/{p.total} lessons</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${e.course.name} progress`}>
                      <div className="h-full bg-navy" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
              {enrolments.length === 0 && <li className="text-slate">You are not enrolled in a course yet. Contact the registrar if this is wrong.</li>}
            </ul>
          </section>
          <section className="panel p-6">
            <h2 className="font-display text-xl font-semibold">Due soon</h2>
            <ul className="mt-3 divide-y divide-line">
              {due.map(({ a, course }) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span><span className="font-medium">{a.title}</span><span className="block text-sm text-slate">{course}</span></span>
                  <span className="text-sm">Due {fmtDateTime(a.dueAt)}</span>
                </li>
              ))}
              {due.length === 0 && <li className="py-3 text-slate">You are up to date.</li>}
            </ul>
          </section>
        </div>
        <div className="space-y-6">
          <section className="panel overflow-hidden">
            <h2 className="bg-navy px-6 py-4 font-display text-xl text-white">Upcoming live sessions</h2>
            <ul className="divide-y divide-line">
              {live.map(({ lesson, courseName }) => (
                <li key={lesson.id} className="px-6 py-4">
                  <p className="font-semibold">{lesson.title}</p>
                  <p className="text-sm text-slate">{courseName} · {fmtDateTime(lesson.startsAt)} · {lesson.durationMins} min</p>
                  <div className="mt-2"><JoinLiveButton lessonId={lesson.id} state={liveWindow(lesson.startsAt, lesson.durationMins)} /></div>
                </li>
              ))}
              {live.length === 0 && <li className="px-6 py-4 text-slate">Date, time and join link appear here when your lecturer schedules a session.</li>}
            </ul>
          </section>
          <section className="panel p-6">
            <div className="flex items-baseline justify-between"><h2 className="font-display text-xl font-semibold">Notices</h2><Link href="/student/notices" className="text-sm underline">All</Link></div>
            <ul className="mt-3 space-y-4">
              {notices.map((n) => <li key={n.id}><p className="font-medium">{n.title}</p><p className="text-sm text-slate line-clamp-2">{n.body}</p></li>)}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
