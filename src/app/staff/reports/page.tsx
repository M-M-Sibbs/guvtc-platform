import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { HBarChart } from "@/components/staff/charts";
import { applicationsByCourse, sourcePerformance } from "@/lib/analytics";
import { fmtMoney } from "@/lib/utils";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requireStaff("analytics.view");
  const [enrol, apps, sources, att, completion, fees] = await Promise.all([
    db.execute<{ course: string; active: number; completed: number; withdrawn: number }>(sql`
      SELECT c.name AS course, count(*) FILTER (WHERE e.status='ACTIVE')::int AS active, count(*) FILTER (WHERE e.status='COMPLETED')::int AS completed,
             count(*) FILTER (WHERE e.status IN ('WITHDRAWN','SUSPENDED'))::int AS withdrawn
      FROM enrolments e JOIN courses c ON c.id = e.course_id GROUP BY c.name ORDER BY c.name`),
    applicationsByCourse(),
    sourcePerformance(),
    db.execute<{ course: string; rate: number; sessions: number }>(sql`
      SELECT c.name AS course, round(100.0 * count(*) FILTER (WHERE a.status IN ('PRESENT','LATE')) / nullif(count(*),0))::int AS rate, count(*)::int AS sessions
      FROM attendance a JOIN class_groups g ON g.id = a.class_group_id JOIN courses c ON c.id = g.course_id GROUP BY c.name`),
    db.execute<{ status: string; n: number }>(sql`SELECT status, count(*)::int AS n FROM applications GROUP BY status`),
    db.execute<{ billed: string; confirmed: string }>(sql`
      SELECT coalesce(sum(i.amount - i.concession),0)::text AS billed,
             coalesce((SELECT sum(p.amount) FROM payments p WHERE p.status='CONFIRMED'),0)::text AS confirmed
      FROM invoices i WHERE i.status <> 'CANCELLED'`),
  ]);
  const funnel = Object.fromEntries(completion.rows.map((r) => [r.status, r.n]));
  const totalApps = completion.rows.reduce((t, r) => t + r.n, 0);
  const exports = [["applications", "Applications"], ["students", "Students & enrolments"], ["results", "Published results"], ["attendance", "Attendance"], ["fees", "Invoices & balances"], ["campaigns", "Campaign performance"]];
  return (
    <>
      <PortalTitle title="Reports" lead="Institution-wide figures. Identifiable student data appears only in exports, and every export is logged." />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="panel p-6">
          <h2 className="font-display text-xl font-semibold">Course demand</h2><p className="mb-4 text-sm text-slate">Applications by course, all time</p>
          <HBarChart data={apps} unit="applications" />
        </section>
        <section className="panel p-6">
          <h2 className="font-display text-xl font-semibold">Admissions funnel</h2>
          <dl className="mt-4 divide-y divide-line">
            {[["Applications received", totalApps], ["Accepted or enrolled", (funnel.ACCEPTED ?? 0) + (funnel.ENROLLED ?? 0)], ["Enrolled", funnel.ENROLLED ?? 0], ["Waitlisted", funnel.WAITLISTED ?? 0], ["Not successful", funnel.REJECTED ?? 0]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between py-2"><dt>{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>
            ))}
          </dl>
          <h3 className="mt-6 font-semibold">Applications by campaign source</h3>
          <ul className="mt-2 text-sm">{sources.map((s) => <li key={s.source} className="flex justify-between py-1"><span>{s.source}</span><span className="tabular-nums">{s.n}</span></li>)}{sources.length === 0 && <li className="text-slate">Add ?utm_source=facebook (etc.) to links you share to track them.</li>}</ul>
        </section>
        <section className="panel overflow-x-auto">
          <h2 className="px-6 pt-5 font-display text-xl font-semibold">Enrolment & completion</h2>
          <table className="table-std mt-3"><thead><tr><th>Course</th><th className="text-right">Active</th><th className="text-right">Completed</th><th className="text-right">Withdrawn/suspended</th></tr></thead>
            <tbody>{enrol.rows.map((r) => <tr key={r.course}><td>{r.course}</td><td className="text-right">{r.active}</td><td className="text-right">{r.completed}</td><td className="text-right">{r.withdrawn}</td></tr>)}</tbody></table>
        </section>
        <section className="panel overflow-x-auto">
          <h2 className="px-6 pt-5 font-display text-xl font-semibold">Attendance</h2>
          <table className="table-std mt-3"><thead><tr><th>Course</th><th className="text-right">Rate</th><th className="text-right">Records</th></tr></thead>
            <tbody>{att.rows.map((r) => <tr key={r.course}><td>{r.course}</td><td className="text-right">{r.rate}%</td><td className="text-right">{r.sessions}</td></tr>)}</tbody></table>
          <p className="px-6 py-4 text-sm">Fees billed {fmtMoney(fees.rows[0].billed)} · confirmed {fmtMoney(fees.rows[0].confirmed)}</p>
        </section>
      </div>
      <section className="panel mt-6 p-6">
        <h2 className="font-display text-xl font-semibold">Exports (CSV)</h2>
        <div className="mt-3 flex flex-wrap gap-2">{exports.map(([k, l]) => <a key={k} href={`/staff/reports/export?type=${k}`} className="btn btn-outline btn-sm">{l}</a>)}</div>
      </section>
    </>
  );
}
