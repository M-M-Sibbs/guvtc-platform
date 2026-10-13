import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveRegister } from "@/app/actions/staff/attendance";
import { cn } from "@/lib/utils";

export const metadata = { title: "Attendance" };
const STATUSES = ["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const;

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireStaff("attendance.record");
  const sp = await searchParams;
  const groups = await db.query.classGroups.findMany({
    where: me.role === "LECTURER" && me.staffId ? eq(s.classGroups.lecturerId, me.staffId) : undefined,
    with: { course: true }, orderBy: asc(s.classGroups.name),
  });
  const classId = sp.class ?? groups[0]?.id;
  const date = sp.date ?? new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 10);
  const group = groups.find((g) => g.id === classId);
  const roster = group ? await db.select({ id: s.students.id, number: s.students.studentNumber, name: s.users.name })
    .from(s.enrolments).innerJoin(s.students, eq(s.enrolments.studentId, s.students.id)).innerJoin(s.users, eq(s.students.userId, s.users.id))
    .where(and(eq(s.enrolments.classGroupId, group.id), eq(s.enrolments.status, "ACTIVE"))).orderBy(asc(s.users.name)) : [];
  const existing = group ? await db.select().from(s.attendance).where(and(eq(s.attendance.classGroupId, group.id), eq(s.attendance.date, date))) : [];
  const summary = group ? await db.select({
    studentId: s.attendance.studentId,
    rate: sql<number>`round(100.0 * count(*) filter (where ${s.attendance.status} in ('PRESENT','LATE')) / nullif(count(*),0))::int`,
    sessions: sql<number>`count(*)::int`,
  }).from(s.attendance).where(eq(s.attendance.classGroupId, group.id)).groupBy(s.attendance.studentId) : [];

  return (
    <>
      <PortalTitle title="Attendance" lead="Daily class registers. Students who join a live class from the portal are marked present automatically." />
      <Flash searchParams={searchParams} />
      <form className="mb-6 flex flex-wrap items-end gap-3">
        <label className="field-label">Class<select name="class" defaultValue={classId} className="input mt-1">{groups.map((g) => <option key={g.id} value={g.id}>{g.name} — {g.course.name}</option>)}</select></label>
        <label className="field-label">Date<input name="date" type="date" defaultValue={date} className="input mt-1" /></label>
        <button className="btn btn-outline">Open register</button>
      </form>
      {group && (
        <form action={saveRegister} className="panel overflow-x-auto">
          <input type="hidden" name="classGroupId" value={group.id} /><input type="hidden" name="date" value={date} />
          <table className="table-std">
            <thead><tr><th>Student</th>{STATUSES.map((st) => <th key={st} className="text-center">{st.toLowerCase()}</th>)}<th className="text-right">Attendance to date</th></tr></thead>
            <tbody>
              {roster.map((r) => {
                const cur = existing.find((e) => e.studentId === r.id)?.status ?? "PRESENT";
                const sum = summary.find((x) => x.studentId === r.id);
                return (
                  <tr key={r.id}>
                    <td>{r.name}<span className="block text-xs text-slate">{r.number}</span></td>
                    {STATUSES.map((st) => (
                      <td key={st} className="text-center"><input type="radio" name={`s_${r.id}`} value={st} defaultChecked={cur === st} aria-label={`${r.name} ${st.toLowerCase()}`} className="h-5 w-5 accent-navy" /></td>
                    ))}
                    <td className={cn("text-right tabular-nums", sum && sum.rate < 75 && "font-semibold text-danger")}>{sum ? `${sum.rate}% of ${sum.sessions}` : "—"}</td>
                  </tr>
                );
              })}
              {roster.length === 0 && <tr><td colSpan={6} className="text-slate">No active students in this class.</td></tr>}
            </tbody>
          </table>
          <div className="flex items-center justify-between gap-3 border-t border-line p-4">
            <p className="text-sm text-slate">{existing.length ? "A register already exists for this date — saving updates it." : "New register."} Below 75% is highlighted.</p>
            <SubmitButton>Save register</SubmitButton>
          </div>
        </form>
      )}
    </>
  );
}
