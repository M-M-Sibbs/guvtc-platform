import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { teachableCourseIds } from "@/lib/teaching";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { Badge, StatusBadge } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveModule, saveLesson, deleteLesson, saveAssignment, gradeSubmission, saveQuiz, postCourseAnnouncement } from "@/app/actions/staff/elearning";
import { signedUrl, uploadMode } from "@/lib/storage";
import { UploadField } from "@/components/ui/upload-field";
import { fmtDateTime, toLocalInput, cn } from "@/lib/utils";

const TABS = [["lessons", "Modules & lessons"], ["assignments", "Assignments"], ["quizzes", "Quizzes"], ["announcements", "Announcements"]] as const;

export default async function ManageCourse({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<Record<string, string>> }) {
  const me = await requireStaff("elearning.manage");
  const { courseId } = await params;
  const ids = await teachableCourseIds(me);
  if (ids !== "all" && !ids.includes(courseId)) redirect("/staff/elearning?error=You%20are%20not%20assigned%20to%20that%20course");
  const sp = await searchParams;
  const tab = TABS.find(([t]) => t === sp.tab)?.[0] ?? "lessons";
  const course = await db.query.courses.findFirst({
    where: eq(s.courses.id, courseId),
    with: {
      modules: { orderBy: asc(s.modules.order), with: { lessons: { orderBy: asc(s.lessons.order) } } },
      assignments: { orderBy: desc(s.assignments.dueAt), with: { submissions: { with: { student: { with: { user: true } } } } } },
      quizzes: { with: { questions: true, attempts: true } },
    },
  });
  if (!course) notFound();
  const announcements = tab === "announcements" ? await db.query.announcements.findMany({ where: eq(s.announcements.courseId, courseId), orderBy: desc(s.announcements.publishedAt), with: { author: true } }) : [];
  return (
    <>
      <Link href="/staff/elearning" className="mb-3 inline-block text-sm underline">All courses</Link>
      <PortalTitle title={course.name} lead="Manage what enrolled students see in the eLearning portal." />
      <Flash searchParams={searchParams} />
      <nav className="mb-6 flex gap-1 border-b border-line" aria-label="Sections">
        {TABS.map(([t, l]) => <Link key={t} href={`?tab=${t}`} aria-current={tab === t ? "page" : undefined} className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-medium", tab === t ? "border-navy" : "border-transparent text-slate hover:text-navy")}>{l}</Link>)}
      </nav>

      {tab === "lessons" && (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            {course.modules.map((m) => (
              <section key={m.id} className="panel overflow-hidden">
                <header className="flex items-baseline justify-between bg-mist-2 px-5 py-3"><h2 className="font-display text-lg font-semibold">{m.title}</h2><span className="text-xs text-slate">Order {m.order}</span></header>
                <ul className="divide-y divide-line">
                  {m.lessons.map((l) => (
                    <li key={l.id} className="px-5 py-3">
                      <details>
                        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                          <span><span className="font-medium">{l.title}</span> <Badge>{l.type.toLowerCase()}</Badge> {!l.published && <Badge tone="warn">hidden</Badge>}
                            {l.startsAt && <span className="block text-xs text-slate">{fmtDateTime(l.startsAt)}</span>}</span>
                          <span className="text-xs underline">Edit</span>
                        </summary>
                        <LessonForm courseId={course.id} modules={course.modules} lesson={l} />
                        <form action={deleteLesson} className="mt-2"><input type="hidden" name="courseId" value={course.id} /><input type="hidden" name="id" value={l.id} /><button className="text-xs text-danger underline">Hide from students</button></form>
                      </details>
                    </li>
                  ))}
                  {m.lessons.length === 0 && <li className="px-5 py-3 text-sm text-slate">No lessons yet.</li>}
                </ul>
              </section>
            ))}
          </div>
          <div className="space-y-5">
            <section className="panel p-5"><h2 className="font-display text-lg font-semibold">Add a lesson</h2>{course.modules.length ? <LessonForm courseId={course.id} modules={course.modules} /> : <p className="mt-2 text-sm text-slate">Create a module first.</p>}</section>
            <section className="panel p-5">
              <h2 className="font-display text-lg font-semibold">Add a module</h2>
              <form action={saveModule} className="mt-3 grid gap-3">
                <input type="hidden" name="courseId" value={course.id} />
                <input name="title" className="input" placeholder="Module title" />
                <textarea name="objectives" className="input" rows={2} placeholder="Learning objectives" />
                <input name="order" type="number" className="input" defaultValue={course.modules.length + 1} aria-label="Order" />
                <SubmitButton variant="outline">Add module</SubmitButton>
              </form>
            </section>
          </div>
        </div>
      )}

      {tab === "assignments" && (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            {course.assignments.map((a) => (
              <section key={a.id} className="panel overflow-hidden">
                <header className="px-5 py-4"><h2 className="font-display text-lg font-semibold">{a.title} {a.practical && <Badge tone="gold">Practical</Badge>}</h2><p className="text-sm text-slate">Due {fmtDateTime(a.dueAt)} · {a.maxMarks} marks · {a.submissions.length} submissions</p></header>
                <table className="table-std">
                  <thead><tr><th>Student</th><th>Submitted</th><th>Work</th><th>Mark & feedback</th></tr></thead>
                  <tbody>
                    {a.submissions.map((sub) => (
                      <tr key={sub.id}>
                        <td>{sub.student.user.name}<span className="block text-xs text-slate">{sub.student.studentNumber}</span></td>
                        <td className="whitespace-nowrap text-sm">{fmtDateTime(sub.submittedAt)}{sub.submittedAt > a.dueAt && <Badge tone="warn" className="ml-1">late</Badge>}</td>
                        <td className="max-w-xs text-sm">{sub.text && <p className="line-clamp-3">{sub.text}</p>}{sub.fileKey && <a href={signedUrl(sub.fileKey)} className="underline">{sub.fileName}</a>}</td>
                        <td>
                          <form action={gradeSubmission} className="grid gap-1">
                            <input type="hidden" name="courseId" value={course.id} /><input type="hidden" name="submissionId" value={sub.id} />
                            <input name="marks" type="number" min={0} max={a.maxMarks} defaultValue={sub.marks ?? ""} className="input !min-h-[34px] !w-24 !py-1" aria-label="Marks" />
                            <textarea name="feedback" defaultValue={sub.feedback ?? ""} rows={2} className="input !min-h-[60px] text-sm" placeholder="Feedback" />
                            <button className="btn btn-outline btn-sm">{sub.gradedAt ? "Update" : "Save mark"}</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                    {a.submissions.length === 0 && <tr><td colSpan={4} className="text-slate">No submissions yet.</td></tr>}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
          <section className="panel h-fit p-5">
            <h2 className="font-display text-lg font-semibold">New assignment</h2>
            <form action={saveAssignment} className="mt-3 grid gap-3">
              <input type="hidden" name="courseId" value={course.id} />
              <input name="title" className="input" placeholder="Title" />
              <textarea name="instructions" className="input" rows={5} placeholder="Instructions" />
              <label className="field-label">Deadline<input name="dueAt" type="datetime-local" className="input mt-1" /></label>
              <label className="field-label">Maximum marks<input name="maxMarks" type="number" defaultValue={100} className="input mt-1" /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="practical" className="accent-navy" />Practical evidence (photos / video of student work)</label>
              <SubmitButton>Publish assignment</SubmitButton>
            </form>
          </section>
        </div>
      )}

      {tab === "quizzes" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            {course.quizzes.map((q) => {
              const avg = q.attempts.length ? Math.round((q.attempts.reduce((t, a) => t + a.score / a.total, 0) / q.attempts.length) * 100) : null;
              return <section key={q.id} className="panel p-5"><h2 className="font-display text-lg font-semibold">{q.title}</h2><p className="text-sm text-slate">{q.questions.length} questions · {q.attempts.length} attempts{avg != null && ` · average ${avg}%`}</p></section>;
            })}
            {course.quizzes.length === 0 && <p className="text-slate">No quizzes yet.</p>}
          </div>
          <section className="panel p-5">
            <h2 className="font-display text-lg font-semibold">New quiz</h2>
            <form action={saveQuiz} className="mt-3 grid gap-3">
              <input type="hidden" name="courseId" value={course.id} />
              <input name="title" className="input" placeholder="Quiz title" />
              <input name="description" className="input" placeholder="Short description" />
              <textarea name="questions" rows={12} className="input font-mono text-sm" placeholder={"Which tool should you use to check AI code?\nYour eyes only\n*Tests and careful reading\nNothing\n\nTrue or false: mobile-first means designing for phones first.\n*True\nFalse"} />
              <p className="field-hint">One question per block: the question, then each option on its own line. Put * before the correct option. Leave a blank line between questions. Multiple-choice and true/false are supported; questions are shuffled for each student.</p>
              <SubmitButton>Create quiz</SubmitButton>
            </form>
          </section>
        </div>
      )}

      {tab === "announcements" && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <ul className="space-y-3">{announcements.map((a) => <li key={a.id} className="panel p-4"><p className="font-semibold">{a.title}</p><p className="text-xs text-slate">{a.author?.name} · {fmtDateTime(a.publishedAt)}</p><p className="mt-2 text-sm whitespace-pre-line">{a.body}</p></li>)}</ul>
          <section className="panel h-fit p-5">
            <h2 className="font-display text-lg font-semibold">Message this class</h2>
            <form action={postCourseAnnouncement} className="mt-3 grid gap-3">
              <input type="hidden" name="courseId" value={course.id} />
              <input name="title" className="input" placeholder="Title" />
              <textarea name="body" rows={5} className="input" placeholder="Message" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="email" className="accent-navy" />Also email enrolled students</label>
              <SubmitButton>Post announcement</SubmitButton>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

type L = { id: string; moduleId: string; title: string; type: string; content: string | null; videoUrl: string | null; meetingUrl: string | null; recordingUrl: string | null; startsAt: Date | null; durationMins: number | null; published: boolean; order: number; fileName: string | null };

function LessonForm({ courseId, modules, lesson }: { courseId: string; modules: { id: string; title: string }[]; lesson?: L }) {
  return (
    <form action={saveLesson} className="mt-3 grid gap-3" encType="multipart/form-data">
      <input type="hidden" name="courseId" value={courseId} />
      {lesson && <input type="hidden" name="id" value={lesson.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field-label">Module<select name="moduleId" className="input mt-1" defaultValue={lesson?.moduleId}>{modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
        <label className="field-label">Type<select name="type" className="input mt-1" defaultValue={lesson?.type ?? "RECORDED"}><option value="RECORDED">Recorded lesson</option><option value="LIVE">Live class</option><option value="NOTES">Notes / resource</option></select></label>
      </div>
      <input name="title" className="input" placeholder="Lesson title" defaultValue={lesson?.title} />
      <textarea name="content" rows={3} className="input" placeholder="Lesson text or instructions" defaultValue={lesson?.content ?? ""} />
      <input name="videoUrl" className="input" placeholder="Recorded: video embed link (https://…)" defaultValue={lesson?.videoUrl ?? ""} />
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_100px]">
        <input name="meetingUrl" className="input" placeholder="Live: Google Meet / Zoom link" defaultValue={lesson?.meetingUrl ?? ""} />
        <input name="startsAt" type="datetime-local" className="input" defaultValue={toLocalInput(lesson?.startsAt)} aria-label="Live start time" />
        <input name="durationMins" type="number" className="input" placeholder="Mins" defaultValue={lesson?.durationMins ?? ""} />
      </div>
      <input name="recordingUrl" className="input" placeholder="Live: recording link after the class (optional)" defaultValue={lesson?.recordingUrl ?? ""} />
      <label className="field-label">Notes / slides file {lesson?.fileName && <span className="font-normal text-slate">(current: {lesson.fileName})</span>}<UploadField name="file" kind="resource" folder={`resources/${courseId}`} mode={uploadMode()} className="input mt-1" /></label>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={lesson?.published ?? true} className="accent-navy" />Visible to students</label>
        {!lesson && <label className="flex items-center gap-2"><input type="checkbox" name="notify" defaultChecked className="accent-navy" />Email students about a new live class</label>}
        <label className="flex items-center gap-2">Order<input name="order" type="number" className="input !w-20" defaultValue={lesson?.order ?? 0} /></label>
      </div>
      <div><SubmitButton variant="outline">{lesson ? "Save lesson" : "Add lesson"}</SubmitButton></div>
    </form>
  );
}
