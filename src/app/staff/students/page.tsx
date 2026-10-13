import Link from "next/link";
import { asc, desc, eq, ilike, or, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PortalTitle } from "@/components/portal/portal-shell";
import { StatusBadge } from "@/components/ui/ui";
import { Flash } from "@/components/staff/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { createStudent } from "@/app/actions/staff/students";

export const metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireStaff("students.view");
  const sp = await searchParams;
  const q = sp.q?.trim();
  const matchingUsers = q ? (await db.select({ id: s.users.id }).from(s.users).where(or(ilike(s.users.name, `%${q}%`), ilike(s.users.email, `%${q}%`)))).map((u) => u.id) : null;
  const students = await db.query.students.findMany({
    where: q ? or(ilike(s.students.studentNumber, `%${q}%`), matchingUsers?.length ? inArray(s.students.userId, matchingUsers) : undefined) : undefined,
    with: { user: true, enrolments: { with: { course: true } } }, orderBy: desc(s.students.createdAt), limit: 300,
  });
  const filtered = sp.course ? students.filter((st) => st.enrolments.some((e) => e.courseId === sp.course)) : students;
  const courses = await db.query.courses.findMany({ orderBy: asc(s.courses.name), with: { classGroups: true, intakes: { where: eq(s.intakes.status, "OPEN") } } });
  return (
    <>
      <PortalTitle title="Students" lead="Student records, enrolments and accounts.">
        {can(me.role, "students.manage") && <a href="#new" className="btn btn-primary">Add student</a>}
      </PortalTitle>
      <Flash searchParams={searchParams} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Name, email or student number" className="input max-w-sm" />
        <select name="course" defaultValue={sp.course ?? ""} className="input max-w-xs"><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button className="btn btn-outline">Search</button>
        <a href="/staff/reports/export?type=students" className="btn btn-outline">Export CSV</a>
      </form>
      <div className="panel overflow-x-auto">
        <table className="table-std">
          <thead><tr><th>Student no.</th><th>Name</th><th>Courses</th><th>Account</th></tr></thead>
          <tbody>
            {filtered.map((st) => (
              <tr key={st.id}>
                <td><Link href={`/staff/students/${st.id}`} className="font-semibold underline-offset-4 hover:underline">{st.studentNumber}</Link></td>
                <td>{st.user.name}<span className="block text-xs text-slate">{st.user.email}</span></td>
                <td>{st.enrolments.map((e) => <span key={e.id} className="mr-2 inline-flex items-center gap-1 text-sm">{e.course.name} <StatusBadge status={e.status} /></span>)}</td>
                <td>{st.user.active ? <StatusBadge status="ACTIVE" /> : <StatusBadge status="SUSPENDED" />}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate">No students found.</td></tr>}
          </tbody>
        </table>
      </div>
      {can(me.role, "students.manage") && (
        <section id="new" className="panel mt-6 p-6">
          <h2 className="font-display text-xl font-semibold">Add a student directly</h2>
          <p className="text-sm text-slate">For walk-in registrations. Online applicants are enrolled from the application page.</p>
          <form action={createStudent} className="mt-4 grid gap-4 md:grid-cols-3">
            <div><label className="field-label">Full name</label><input name="name" className="input" /></div>
            <div><label className="field-label">Email</label><input name="email" type="email" className="input" /></div>
            <div><label className="field-label">Phone</label><input name="phone" className="input" /></div>
            <div><label className="field-label">Course</label><select name="courseId" className="input"><option value="">Choose…</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="field-label">Intake</label><select name="intakeId" className="input"><option value="">—</option>{courses.flatMap((c) => c.intakes.map((i) => <option key={i.id} value={i.id}>{c.name}: {i.name}</option>))}</select></div>
            <div><label className="field-label">Class group</label><select name="classGroupId" className="input"><option value="">Assign later</option>{courses.flatMap((c) => c.classGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>))}</select></div>
            <div><SubmitButton>Create student & send welcome email</SubmitButton></div>
          </form>
        </section>
      )}
    </>
  );
}
