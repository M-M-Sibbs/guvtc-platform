import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStudent } from "@/lib/auth";
import { lessonWithAccess, liveWindow } from "@/lib/student-data";
import { signedUrl } from "@/lib/storage";
import { Icon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/ui";
import { CompleteToggle } from "@/components/student/complete-toggle";
import { JoinLiveButton } from "@/components/student/join-live";
import { fmtDateTime } from "@/lib/utils";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireStudent();
  const lesson = await lessonWithAccess(me.studentId, id);
  if (!lesson) notFound();
  const done = !!(await db.query.lessonProgress.findFirst({ where: and(eq(s.lessonProgress.lessonId, id), eq(s.lessonProgress.studentId, me.studentId)) }));
  // previous / next within the course
  const all = await db.select({ id: s.lessons.id, title: s.lessons.title }).from(s.lessons).innerJoin(s.modules, eq(s.lessons.moduleId, s.modules.id))
    .where(and(eq(s.modules.courseId, lesson.module.courseId), eq(s.lessons.published, true))).orderBy(asc(s.modules.order), asc(s.lessons.order));
  const idx = all.findIndex((l) => l.id === id);
  const prev = all[idx - 1], next = all[idx + 1];
  const state = liveWindow(lesson.startsAt, lesson.durationMins);
  const video = lesson.type === "RECORDED" ? lesson.videoUrl : lesson.type === "LIVE" && state === "ended" ? lesson.recordingUrl : null;

  return (
    <article className="mx-auto max-w-4xl">
      <Link href={`/student/courses/${lesson.module.courseId}`} className="mb-4 inline-flex items-center gap-1 text-sm underline"><Icon.Back size={14} />{lesson.module.course.name}</Link>
      <p className="text-sm text-slate">{lesson.module.title}</p>
      <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{lesson.title}</h1>

      {lesson.type === "LIVE" && (
        <div className="panel mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold">Live class · {fmtDateTime(lesson.startsAt)}</p>
            <p className="text-sm text-slate">{lesson.durationMins} minutes. Joining records your attendance.</p>
          </div>
          <JoinLiveButton lessonId={lesson.id} state={state} />
          {state === "ended" && !lesson.recordingUrl && <span className="text-sm text-slate">This class has ended. A recording will appear here if your lecturer uploads one.</span>}
        </div>
      )}

      {video && (
        <div className="mt-6 overflow-hidden rounded-md bg-navy">
          <iframe src={video} title={lesson.title} className="aspect-video w-full" allow="encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      )}

      {lesson.content && <div className="prose-guvtc mt-6 text-lg">{lesson.content.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>}

      {lesson.fileKey && (
        <a href={signedUrl(lesson.fileKey, 30)} className="panel mt-6 flex items-center gap-4 p-4 hover:border-navy">
          <Icon.Download className="text-navy" />
          <span><span className="block font-semibold">{lesson.fileName}</span><span className="text-sm text-slate">Download to study offline</span></span>
        </a>
      )}
      {lesson.type === "NOTES" && !lesson.fileKey && !lesson.content && <Notice>Your lecturer has not attached notes yet.</Notice>}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <CompleteToggle lessonId={lesson.id} done={done} />
        <div className="flex gap-2">
          {prev && <Link href={`/student/lessons/${prev.id}`} className="btn btn-outline btn-sm"><Icon.Back size={14} />Previous</Link>}
          {next && <Link href={`/student/lessons/${next.id}`} className="btn btn-outline btn-sm">Next lesson<Icon.Arrow size={14} /></Link>}
        </div>
      </div>
    </article>
  );
}
