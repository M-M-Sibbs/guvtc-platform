import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PortalTitle } from "@/components/portal/portal-shell";
import { StatusBadge, Badge } from "@/components/ui/ui";
import { Flash } from "@/components/staff/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateStudent, updateEnrolment, addEnrolment, setAccountActive, resendSetup } from "@/app/actions/staff/students";
import { invoiceBalance } from "@/lib/finance";
import { fmtDate, fmtMoney, toLocalInput } from "@/lib/utils";

export default async function StudentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const me = await requireStaff("students.view");
  const { id } = await params;
  const st = await db.query.students.findFirst({
    where: eq(s.students.id, id),
    with: { user: true, enrolments: { with: { course: { with: { classGroups: true } }, intake: true, classGroup: true } }, invoices: { with: { payments: true }, orderBy: desc(s.invoices.createdAt) } },
  });
  if (!st) notFound();
  const manage = can(me.role, "students.manage");
  const seeMarks = can(me.role, "marks.enter") || can(me.role, "results.approve") || me.role === "PRINCIPAL" || me.role === "REGISTRAR";
  const seeFinance = can(me.role, "finance.manage") || me.role === "PRINCIPAL";
  const [att, results, courses] = await Promise.all([
    db.select({ status: s.attendance.status, n: sql<number>`count(*)::int` }).from(s.attendance).where(eq(s.attendance.studentId, id)).groupBy(s.attendance.status),
    seeMarks ? db.query.results.findMany({ where: eq(s.results.studentId, id), with: { assessment: { with: { course: true } } } }) : [],
    db.query.courses.findMany({ orderBy: asc(s.courses.name), with: { classGroups: true } }),
  ]);
  const attTotal = att.reduce((t, a) => t + a.n, 0);
  const present = att.filter((a) => a.status === "PRESENT" || a.status === "LATE").reduce((t, a) => t + a.n, 0);
  const ret = `/staff/students/${id}`;
  return (
    <>
      <Link href="/staff/students" className="mb-3 inline-block text-sm underline">All students</Link>
      <PortalTitle title={st.user.name} lead={`${st.studentNumber} · ${st.user.email} · attendance ${attTotal ? Math.round((present / attTotal) * 100) + "%" : "—"}`}>
        {manage && (
          <>
            <form action={resendSetup}><input type="hidden" name="userId" value={st.userId} /><input type="hidden" name="returnTo" value={ret} /><button className="btn btn-outline btn-sm">Send set-password email</button></form>
            <form action={setAccountActive}><input type="hidden" name="userId" value={st.userId} /><input type="hidden" name="returnTo" value={ret} /><input type="hidden" name="active" value={String(!st.user.active)} /><button className={`btn btn-sm ${st.user.active ? "btn-outline" : "btn-primary"}`}>{st.user.active ? "Deactivate account" : "Re-activate account"}</button></form>
          </>
        )}
      </PortalTitle>
      <Flash searchParams={searchParams} />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-display text-xl font-semibold">Enrolments</h2>
          <ul className="mt-3 space-y-4">
            {st.enrolments.map((e) => (
              <li key={e.id} className="rounded-md border border-line p-4">
                <div className="flex items-center justify-between"><p className="font-semibold">{e.course.name}</p><StatusBadge status={e.status} /></div>
                <p className="text-sm text-slate">{e.intake?.name ?? "No intake"} · {e.classGroup?.name ?? "No class"} · started {fmtDate(e.startDate)}</p>
                {manage && (
                  <form action={updateEnrolment} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="enrolmentId" value={e.id} />
                    <select name="status" defaultValue={e.status} className="input !min-h-[34px] !w-auto !py-1 text-sm"><option>ACTIVE</option><option>COMPLETED</option><option>SUSPENDED</option><option>WITHDRAWN</option></select>
                    <select name="classGroupId" defaultValue={e.classGroupId ?? ""} className="input !min-h-[34px] !w-auto !py-1 text-sm"><option value="">No class</option>{e.course.classGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                    <button className="btn btn-outline btn-sm">Update</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {manage && (
            <form action={addEnrolment} className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              <input type="hidden" name="studentId" value={st.id} />
              <select name="courseId" className="input !w-auto">{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <button className="btn btn-outline btn-sm">Add enrolment</button>
            </form>
          )}
        </section>
        <section className="panel p-5">
          <h2 className="font-display text-xl font-semibold">Record</h2>
          {manage ? (
            <form action={updateStudent} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={st.id} />
              <div className="sm:col-span-2"><label className="field-label">Name</label><input name="name" className="input" defaultValue={st.user.name} /></div>
              <div><label className="field-label">Phone</label><input name="phone" className="input" defaultValue={st.phone ?? ""} /></div>
              <div><label className="field-label">National ID</label><input name="nationalId" className="input" defaultValue={st.nationalId ?? ""} /></div>
              <div><label className="field-label">Date of birth</label><input name="dateOfBirth" type="date" className="input" defaultValue={toLocalInput(st.dateOfBirth, true)} /></div>
              <div><label className="field-label">Emergency contact</label><input name="emergencyContact" className="input" defaultValue={st.emergencyContact ?? ""} /></div>
              <div className="sm:col-span-2"><label className="field-label">Address</label><input name="address" className="input" defaultValue={st.address ?? ""} /></div>
              <div className="sm:col-span-2"><label className="field-label">Reason for change</label><input name="reason" className="input" placeholder="Recorded in the audit log" /></div>
              <div><SubmitButton variant="outline">Save record</SubmitButton></div>
            </form>
          ) : (
            <dl className="mt-3 space-y-1 text-sm"><div>Phone: {st.phone ?? "—"}</div><div>Address: {st.address ?? "—"}</div></dl>
          )}
        </section>
        {seeMarks && (
          <section className="panel overflow-hidden">
            <h2 className="px-5 py-4 font-display text-xl font-semibold">Marks</h2>
            <table className="table-std"><thead><tr><th>Course</th><th>Assessment</th><th>Mark</th><th>Published</th></tr></thead>
              <tbody>{results.map((r) => <tr key={r.id}><td>{r.assessment.course.name}</td><td>{r.assessment.title}</td><td>{r.status === "RECORDED" ? `${r.marks}/${r.assessment.maxMarks}` : r.status}</td><td>{r.assessment.publishedAt ? fmtDate(r.assessment.publishedAt) : <Badge>Not published</Badge>}</td></tr>)}</tbody>
            </table>
          </section>
        )}
        {seeFinance && (
          <section className="panel overflow-hidden">
            <h2 className="px-5 py-4 font-display text-xl font-semibold">Fees</h2>
            <table className="table-std"><thead><tr><th>Invoice</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>{st.invoices.map((i) => <tr key={i.id}><td><Link className="underline" href={`/staff/finance/${i.id}`}>{i.number}</Link><span className="block text-xs text-slate">{i.description}</span></td><td>{fmtMoney(i.amount)}</td><td>{fmtMoney(invoiceBalance(i).balance)}</td><td><StatusBadge status={i.status} /></td></tr>)}</tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}
