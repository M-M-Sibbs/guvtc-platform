import Link from "next/link";
import { and, asc, desc, eq, ilike, or, count } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { StatusBadge } from "@/components/ui/ui";
import { Flash } from "@/components/staff/flash";
import { fmtDateTime } from "@/lib/utils";
import { applicationStatusEnum, type ApplicationStatus } from "@/db/schema";

export const metadata = { title: "Applications" };

export default async function AdmissionsList({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("applications.view");
  const sp = await searchParams;
  const status = applicationStatusEnum.enumValues.includes(sp.status as ApplicationStatus) ? (sp.status as ApplicationStatus) : undefined;
  const q = sp.q?.trim();
  const where = and(
    status ? eq(s.applications.status, status) : undefined,
    sp.course ? eq(s.applications.courseId, sp.course) : undefined,
    q ? or(ilike(s.applications.reference, `%${q}%`), ilike(s.applications.lastName, `%${q}%`), ilike(s.applications.firstName, `%${q}%`), ilike(s.applications.email, `%${q}%`), ilike(s.applications.phone, `%${q}%`)) : undefined,
  );
  const [apps, courses, counts] = await Promise.all([
    db.query.applications.findMany({ where, with: { course: true, intake: true, documents: { columns: { id: true } } }, orderBy: desc(s.applications.submittedAt), limit: 200 }),
    db.select({ id: s.courses.id, name: s.courses.name }).from(s.courses).orderBy(asc(s.courses.name)),
    db.select({ status: s.applications.status, n: count() }).from(s.applications).groupBy(s.applications.status),
  ]);
  const qs = (o: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ ...sp, ...o }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <PortalTitle title="Applications" lead="Review queue for online applications. Decisions are recorded with your name and emailed to the applicant." />
      <Flash searchParams={searchParams} />
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href={qs({ status: undefined })} className={`rounded-sm border px-3 py-1 ${!status ? "border-navy bg-navy text-white" : "border-line bg-white"}`}>All</Link>
        {applicationStatusEnum.enumValues.map((st) => {
          const n = counts.find((c) => c.status === st)?.n ?? 0;
          return <Link key={st} href={qs({ status: st })} className={`rounded-sm border px-3 py-1 ${status === st ? "border-navy bg-navy text-white" : "border-line bg-white"}`}>{st.replace(/_/g, " ").toLowerCase()} ({n})</Link>;
        })}
      </nav>
      <form className="mb-4 flex flex-wrap gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Search name, reference, email or phone" className="input max-w-sm" />
        <select name="course" defaultValue={sp.course ?? ""} className="input max-w-xs"><option value="">All courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button className="btn btn-outline">Filter</button>
        <a href={`/staff/reports/export?type=applications${status ? `&status=${status}` : ""}`} className="btn btn-outline">Export CSV</a>
      </form>
      <div className="panel overflow-x-auto">
        <table className="table-std">
          <thead><tr><th>Reference</th><th>Applicant</th><th>Course & intake</th><th>Docs</th><th>Submitted</th><th>Status</th></tr></thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/staff/admissions/${a.id}`} className="font-semibold underline-offset-4 hover:underline">{a.reference}</Link></td>
                <td>{a.firstName} {a.lastName}<span className="block text-xs text-slate">{a.email}</span></td>
                <td>{a.course.name}<span className="block text-xs text-slate">{a.intake?.name ?? "Next available"}</span></td>
                <td>{a.documents.length}</td>
                <td className="whitespace-nowrap">{fmtDateTime(a.submittedAt)}</td>
                <td><StatusBadge status={a.status} /></td>
              </tr>
            ))}
            {apps.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate">No applications match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
