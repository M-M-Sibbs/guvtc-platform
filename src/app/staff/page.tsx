import Link from "next/link";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Notice, Stat, StatusBadge } from "@/components/ui/ui";
import { HBarChart, TrendChart } from "@/components/staff/charts";
import { applicationsByCourse, applicationsByWeek, campaignPerformance, attendanceRate } from "@/lib/analytics";
import { liveAdCondition, adState } from "@/lib/queries";
import { fmtDate, fmtDateTime, fmtMoney } from "@/lib/utils";
import { emailWarning } from "@/lib/email";

export default async function StaffDashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const me = await requireStaff();
  const { denied } = await searchParams;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const seeApps = can(me.role, "applications.view");
  const seeAds = can(me.role, "ads.manage");
  const seeFinance = can(me.role, "finance.manage");
  const seeStudents = can(me.role, "students.view");

  const [[appsMonth], [awaiting], [students], [liveAds], byCourse, byWeek, campaigns, recent, owed, attRate, myClasses] = await Promise.all([
    db.select({ n: count() }).from(s.applications).where(gte(s.applications.submittedAt, monthStart)),
    db.select({ n: count() }).from(s.applications).where(inArray(s.applications.status, ["SUBMITTED", "UNDER_REVIEW"])),
    db.select({ n: count() }).from(s.enrolments).where(eq(s.enrolments.status, "ACTIVE")),
    db.select({ n: count() }).from(s.advertisements).where(liveAdCondition()),
    seeApps || seeAds ? applicationsByCourse() : [],
    seeApps || seeAds ? applicationsByWeek(8) : [],
    seeAds ? campaignPerformance() : [],
    seeApps ? db.query.applications.findMany({ with: { course: true }, orderBy: desc(s.applications.submittedAt), limit: 6 }) : [],
    seeFinance ? db.execute<{ owed: string }>(sql`
      SELECT coalesce(sum(i.amount - i.concession - coalesce((SELECT sum(p.amount) FROM payments p WHERE p.invoice_id = i.id AND p.status = 'CONFIRMED'),0)),0)::text AS owed
      FROM invoices i WHERE i.status <> 'CANCELLED'`) : null,
    seeStudents ? attendanceRate() : null,
    me.role === "LECTURER" && me.staffId ? db.query.classGroups.findMany({ where: eq(s.classGroups.lecturerId, me.staffId), with: { course: true, enrolments: true } }) : [],
  ]);

  return (
    <>
      <PortalTitle title={`Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${me.name.split(" ")[0]}`} lead={fmtDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
        {seeAds && <Link href="/staff/adverts/new" className="btn btn-outline">New advert</Link>}
        {seeApps && <Link href="/staff/admissions?status=SUBMITTED" className="btn btn-primary">Review applications</Link>}
      </PortalTitle>
      {denied && <div className="mb-6"><Notice tone="warn">Your role does not have access to that page. Ask a system administrator if you need it.</Notice></div>}
      {(can(me.role, "settings.manage") || can(me.role, "notifications.manage")) && emailWarning() && (
        <div className="mb-6"><Notice tone="warn">{emailWarning()}</Notice></div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {seeApps && <Stat label="Applications this month" value={appsMonth.n} sub={<Link className="underline" href="/staff/admissions">Open admissions</Link>} />}
        {seeApps && <Stat label="Awaiting review" value={awaiting.n} />}
        {seeStudents && <Stat label="Active enrolments" value={students.n} sub={attRate != null ? `Attendance rate ${attRate}%` : undefined} />}
        {seeAds && <Stat label="Live adverts" value={liveAds.n} />}
        {seeFinance && owed && <Stat label="Outstanding fees" value={fmtMoney(owed.rows[0].owed)} sub="Confirmed payments only" />}
      </div>

      {myClasses.length > 0 && (
        <section className="panel mt-6 p-6">
          <h2 className="font-display text-xl font-semibold">My classes</h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {myClasses.map((c) => (
              <li key={c.id} className="rounded-md border border-line p-4">
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-slate">{c.course.name} · {c.enrolments.length} students · {c.room}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/staff/elearning/${c.courseId}`} className="btn btn-outline btn-sm">Lessons</Link>
                  <Link href={`/staff/attendance?class=${c.id}`} className="btn btn-outline btn-sm">Register</Link>
                  <Link href={`/staff/results?course=${c.courseId}`} className="btn btn-outline btn-sm">Marks</Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(seeApps || seeAds) && (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="panel p-6">
            <h2 className="font-display text-xl font-semibold">Applications per week</h2>
            <p className="mb-4 text-sm text-slate">Last 8 weeks</p>
            {byWeek.length ? <TrendChart data={byWeek} unit="applications" /> : <p className="text-slate">No applications yet.</p>}
          </section>
          <section className="panel p-6">
            <h2 className="font-display text-xl font-semibold">Applications by course</h2>
            <p className="mb-4 text-sm text-slate">All time, top 12</p>
            {byCourse.length ? <HBarChart data={byCourse} unit="applications" /> : <p className="text-slate">No applications yet.</p>}
          </section>
        </div>
      )}

      {seeAds && (
        <section className="panel mt-6 overflow-hidden">
          <div className="flex items-baseline justify-between px-6 pt-5">
            <h2 className="font-display text-xl font-semibold">Campaign performance</h2>
            <Link href="/staff/adverts" className="text-sm underline">Manage adverts</Link>
          </div>
          <p className="px-6 pb-4 text-sm text-slate">Clicks, enquiries and completed applications attributed to each advert (first-party, aggregate only).</p>
          <div className="overflow-x-auto">
            <table className="table-std">
              <thead><tr><th>Advert</th><th>State</th><th className="text-right">Clicks</th><th className="text-right">Enquiries</th><th className="text-right">Applications</th><th className="text-right">Conversion</th></tr></thead>
              <tbody>
                {campaigns.slice(0, 8).map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/staff/adverts/${c.id}`} className="font-medium hover:underline">{c.title}</Link></td>
                    <td><StatusBadge status={adState({ status: c.status, startsAt: c.startsAt, expiresAt: c.expiresAt })} /></td>
                    <td className="text-right tabular-nums">{c.clicks}</td>
                    <td className="text-right tabular-nums">{c.enquiries}</td>
                    <td className="text-right tabular-nums">{c.applications}</td>
                    <td className="text-right tabular-nums">{c.clicks ? `${Math.round((c.applications / c.clicks) * 100)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {seeApps && (
        <section className="panel mt-6 overflow-hidden">
          <h2 className="px-6 py-5 font-display text-xl font-semibold">Latest applications</h2>
          <table className="table-std">
            <thead><tr><th>Reference</th><th>Applicant</th><th>Course</th><th>Submitted</th><th>Status</th></tr></thead>
            <tbody>
              {recent.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/staff/admissions/${a.id}`} className="font-medium underline-offset-4 hover:underline">{a.reference}</Link></td>
                  <td>{a.firstName} {a.lastName}</td><td>{a.course.name}</td><td>{fmtDateTime(a.submittedAt)}</td><td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
