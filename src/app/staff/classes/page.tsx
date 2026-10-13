import { asc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveClassGroup, addSlot, deleteSlot } from "@/app/actions/staff/classes";
import { findConflicts } from "@/lib/timetable";
import { Badge } from "@/components/ui/ui";

export const metadata = { title: "Classes & timetable" };
const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function ClassesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("classes.manage");
  const [groups, courses, lecturers] = await Promise.all([
    db.query.classGroups.findMany({ with: { course: true, lecturer: { with: { user: true } }, enrolments: true, timetable: { orderBy: [asc(s.timetableSlots.dayOfWeek), asc(s.timetableSlots.startTime)] } }, orderBy: asc(s.classGroups.name) }),
    db.select({ id: s.courses.id, name: s.courses.name }).from(s.courses).orderBy(asc(s.courses.name)),
    db.query.staff.findMany({ with: { user: true } }),
  ]);
  const teaching = lecturers.filter((l) => l.user.role === "LECTURER");
  const all = groups.flatMap((g) => g.timetable.map((t) => ({ ...t, lecturerId: g.lecturerId, label: g.name })));
  return (
    <>
      <PortalTitle title="Classes & timetable" lead="Class groups, lecturers, rooms and weekly slots. Room, lecturer and class clashes are detected when you add a slot." />
      <Flash searchParams={searchParams} />
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.id} className="panel p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-semibold">{g.name}</h2>
              <p className="text-sm text-slate">{g.course.name} · {g.lecturer?.user.name ?? "No lecturer"} · {g.room ?? "No room"} · {g.enrolments.length}/{g.capacity ?? "∞"} students</p>
            </div>
            <ul className="mt-3 divide-y divide-line text-sm">
              {g.timetable.map((t) => {
                const clash = findConflicts({ ...t, lecturerId: g.lecturerId }, all).length > 0;
                return (
                  <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                    <span>{DAYS[t.dayOfWeek]} {t.startTime}–{t.endTime} · {t.activity} · {t.room}{clash && <Badge tone="danger" className="ml-2">Clash</Badge>}</span>
                    <form action={deleteSlot}><input type="hidden" name="id" value={t.id} /><button className="text-xs text-danger underline">Remove</button></form>
                  </li>
                );
              })}
            </ul>
            <details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Add a slot</summary>
              <form action={addSlot} className="mt-3 grid gap-2 sm:grid-cols-6 sm:items-end">
                <input type="hidden" name="classGroupId" value={g.id} />
                <div><label className="field-label">Day</label><select name="dayOfWeek" className="input">{DAYS.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></div>
                <div><label className="field-label">Start</label><input name="startTime" type="time" className="input" defaultValue="08:00" /></div>
                <div><label className="field-label">End</label><input name="endTime" type="time" className="input" defaultValue="10:00" /></div>
                <div><label className="field-label">Room</label><input name="room" className="input" defaultValue={g.room ?? ""} /></div>
                <div><label className="field-label">Activity</label><input name="activity" className="input" defaultValue="Lesson" /></div>
                <div className="grid gap-1"><label className="flex items-center gap-1 text-xs"><input type="checkbox" name="force" />Save anyway</label><SubmitButton variant="outline">Add</SubmitButton></div>
              </form>
            </details>
          </section>
        ))}
      </div>
      <section className="panel mt-6 p-5">
        <h2 className="font-display text-xl font-semibold">New class group</h2>
        <form action={saveClassGroup} className="mt-3 grid gap-3 sm:grid-cols-5 sm:items-end">
          <div><label className="field-label">Name</label><input name="name" className="input" placeholder="e.g. CM — Jan 2027 A" /></div>
          <div><label className="field-label">Course</label><select name="courseId" className="input">{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="field-label">Lecturer</label><select name="lecturerId" className="input"><option value="">—</option>{teaching.map((l) => <option key={l.id} value={l.id}>{l.user.name}</option>)}</select></div>
          <div><label className="field-label">Room</label><input name="room" className="input" /></div>
          <div className="grid grid-cols-[1fr_auto] gap-2"><input name="capacity" type="number" placeholder="Capacity" className="input" /><SubmitButton>Create</SubmitButton></div>
        </form>
      </section>
    </>
  );
}
