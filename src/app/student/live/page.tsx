import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { accessibleCourseIds, upcomingLive, pastLive, liveWindow } from "@/lib/student-data";
import { PortalTitle } from "@/components/portal/portal-shell";
import { JoinLiveButton } from "@/components/student/join-live";
import { fmtDate, fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Live classes" };

export default async function LivePage() {
  const me = await requireStudent();
  const ids = await accessibleCourseIds(me.studentId);
  const [up, past] = await Promise.all([upcomingLive(ids, 30), pastLive(ids)]);
  return (
    <>
      <PortalTitle title="Live classes" lead="Upcoming sessions and class links. Joining from here records your attendance." />
      <section className="panel overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 font-display text-xl font-semibold">Upcoming</h2>
        <ul className="divide-y divide-line">
          {up.map(({ lesson, courseName }) => (
            <li key={lesson.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[90px_1fr_auto] sm:items-center">
              <div className="text-center"><p className="text-xs text-slate">{fmtDate(lesson.startsAt, { weekday: "short" })}</p><p className="font-display text-2xl">{fmtDate(lesson.startsAt, { day: "numeric", month: "short" })}</p></div>
              <div><Link href={`/student/lessons/${lesson.id}`} className="font-semibold hover:underline">{lesson.title}</Link><p className="text-sm text-slate">{courseName} · {fmtDateTime(lesson.startsAt)} · {lesson.durationMins} min</p></div>
              <JoinLiveButton lessonId={lesson.id} state={liveWindow(lesson.startsAt, lesson.durationMins)} />
            </li>
          ))}
          {up.length === 0 && <li className="px-5 py-6 text-slate">No live classes scheduled.</li>}
        </ul>
      </section>
      <section className="panel mt-6 overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 font-display text-xl font-semibold">Past sessions</h2>
        <ul className="divide-y divide-line">
          {past.map(({ lesson, courseName }) => (
            <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <span><Link href={`/student/lessons/${lesson.id}`} className="font-medium hover:underline">{lesson.title}</Link><span className="block text-sm text-slate">{courseName} · {fmtDateTime(lesson.startsAt)}</span></span>
              <span className="text-sm">{lesson.recordingUrl ? <Link className="underline" href={`/student/lessons/${lesson.id}`}>Watch recording</Link> : <span className="text-slate">No recording</span>}</span>
            </li>
          ))}
          {past.length === 0 && <li className="px-5 py-6 text-slate">No past sessions yet.</li>}
        </ul>
      </section>
    </>
  );
}
