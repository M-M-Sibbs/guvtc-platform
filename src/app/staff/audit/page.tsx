import { desc, ilike, or } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("audit.view");
  const { q } = await searchParams;
  const rows = await db.select().from(s.auditLogs)
    .where(q ? or(ilike(s.auditLogs.action, `%${q}%`), ilike(s.auditLogs.actorName, `%${q}%`), ilike(s.auditLogs.entity, `%${q}%`)) : undefined)
    .orderBy(desc(s.auditLogs.createdAt)).limit(300);
  return (
    <>
      <PortalTitle title="Audit log" lead="Who did what, and when: admissions decisions, marks, payments, record changes, exports and sign-ins." />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} className="input max-w-sm" placeholder="Filter: result, payment, a person's name…" /><button className="btn btn-outline">Filter</button></form>
      <div className="panel overflow-x-auto">
        <table className="table-std text-sm">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                <td>{r.actorName}</td>
                <td className="font-mono text-xs">{r.action}</td>
                <td className="text-xs">{r.entity}{r.entityId && <span className="block text-slate">{r.entityId.slice(0, 8)}</span>}</td>
                <td className="max-w-md truncate font-mono text-xs text-slate" title={r.meta ? JSON.stringify(r.meta) : ""}>{r.meta ? JSON.stringify(r.meta) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
