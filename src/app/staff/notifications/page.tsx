import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { Notice, StatusBadge } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { retryAll, retryOne } from "@/app/actions/staff/admin";
import { emailWarning, MAX_ATTEMPTS } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Email log" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("notifications.manage");
  const sp = await searchParams;
  const st = await getSettings();
  const status = ["PENDING", "SENT", "FAILED"].find((x) => x === sp.status) as "FAILED" | undefined;
  const rows = await db.select().from(s.notifications).where(status ? eq(s.notifications.status, status) : undefined).orderBy(desc(s.notifications.createdAt)).limit(200);
  return (
    <>
      <PortalTitle title="Email log" lead={`Every email the platform sends, with delivery status. Admissions notifications go to ${st.admissions_email}.`}>
        <form action={retryAll}><SubmitButton variant="outline" pending="Retrying…">Retry failed</SubmitButton></form>
      </PortalTitle>
      <Flash searchParams={searchParams} />
      {emailWarning() && <div className="mb-4"><Notice tone="warn">{emailWarning()}</Notice></div>}
      <p className="mb-3 text-sm text-slate">Failed messages are retried automatically by the scheduled job, up to {MAX_ATTEMPTS} attempts.</p>
      <div className="panel overflow-x-auto">
        <table className="table-std">
          <thead><tr><th>Created</th><th>To</th><th>Subject</th><th>Status</th><th>Attempts</th><th></th></tr></thead>
          <tbody>
            {rows.map((n) => (
              <tr key={n.id}>
                <td className="whitespace-nowrap text-sm">{fmtDateTime(n.createdAt)}</td>
                <td className="text-sm">{n.to}</td>
                <td className="text-sm">{n.subject}{n.lastError && <span className="block text-xs text-danger">{n.lastError}</span>}</td>
                <td><StatusBadge status={n.status} /></td>
                <td>{n.attempts}</td>
                <td>{n.status !== "SENT" && <form action={retryOne}><input type="hidden" name="id" value={n.id} /><button className="btn btn-outline btn-sm">Retry</button></form>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
