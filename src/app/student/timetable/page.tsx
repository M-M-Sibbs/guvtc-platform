import { eq, and, isNotNull } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStudent } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";

export const metadata = { title: "Timetable" };
const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function TimetablePage() {
  const me = await requireStudent();
  const rows = await db.select({ slot: s.timetableSlots, group: s.classGroups.name, course: s.courses.name })
    .from(s.enrolments)
    .innerJoin(s.classGroups, eq(s.enrolments.classGroupId, s.classGroups.id))
    .innerJoin(s.timetableSlots, eq(s.timetableSlots.classGroupId, s.classGroups.id))
    .innerJoin(s.courses, eq(s.classGroups.courseId, s.courses.id))
    .where(and(eq(s.enrolments.studentId, me.studentId), eq(s.enrolments.status, "ACTIVE"), isNotNull(s.enrolments.classGroupId)));
  const today = ((new Date().getDay() + 6) % 7) + 1;
  return (
    <>
      <PortalTitle title="Timetable" lead="Your weekly lessons, practicals and live sessions." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((d) => {
          const slots = rows.filter((r) => r.slot.dayOfWeek === d).sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
          if (!slots.length && d === 6) return null;
          return (
            <section key={d} className={`panel p-5 ${d === today ? "border-navy ring-2 ring-gold" : ""}`}>
              <h2 className="font-display text-lg font-semibold">{DAYS[d]}{d === today && <span className="ml-2 text-sm font-normal text-gold-ink">Today</span>}</h2>
              <ul className="mt-3 space-y-3">
                {slots.map((r) => (
                  <li key={r.slot.id} className="border-l-4 border-navy pl-3">
                    <p className="text-sm font-semibold">{r.slot.startTime}–{r.slot.endTime} · {r.slot.activity}</p>
                    <p className="text-sm text-slate">{r.course} · {r.slot.room ?? ""}</p>
                  </li>
                ))}
                {!slots.length && <li className="text-sm text-slate">No classes</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
