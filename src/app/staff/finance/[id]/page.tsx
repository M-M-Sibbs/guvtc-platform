import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { Badge, StatusBadge } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { recordPayment, confirmPayment, reversePayment, applyConcession } from "@/app/actions/staff/finance";
import { invoiceBalance } from "@/lib/finance";
import { fmtDate, fmtMoney } from "@/lib/utils";

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const me = await requireStaff("finance.manage");
  const { id } = await params;
  const inv = await db.query.invoices.findFirst({ where: eq(s.invoices.id, id), with: { student: { with: { user: true } }, payments: { orderBy: asc(s.payments.paidAt) } } });
  if (!inv) notFound();
  const b = invoiceBalance(inv);
  const confirmer = can(me.role, "finance.confirm");
  return (
    <>
      <Link href="/staff/finance" className="mb-3 inline-block text-sm underline">All invoices</Link>
      <PortalTitle title={`Invoice ${inv.number}`} lead={<>{inv.student.user.name} ({inv.student.studentNumber}) · {inv.description} · due {fmtDate(inv.dueDate)} <StatusBadge status={inv.status} /></>} />
      <Flash searchParams={searchParams} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[["Amount", inv.amount], ["Concession", inv.concession], ["Confirmed paid", b.confirmed], ["Balance", b.balance]].map(([k, v]) => (
          <div key={k as string} className="panel p-4"><p className="text-sm text-slate">{k}</p><p className="font-display text-2xl font-semibold">{fmtMoney(v as number, inv.currency)}</p></div>
        ))}
      </div>
      <section className="panel overflow-x-auto">
        <table className="table-std">
          <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th><th>Status</th><th>Receipt</th><th></th></tr></thead>
          <tbody>
            {inv.payments.map((p) => (
              <tr key={p.id}>
                <td>{fmtDate(p.paidAt)}</td><td>{p.method}{p.manualEntry && <Badge className="ml-1">manual</Badge>}</td><td>{p.reference ?? "—"}</td>
                <td className="text-right tabular-nums">{fmtMoney(p.amount, inv.currency)}</td><td><StatusBadge status={p.status} /></td>
                <td>{p.receiptNumber ? <Link className="underline" href={`/staff/finance/receipt/${p.id}`}>{p.receiptNumber}</Link> : "—"}</td>
                <td className="whitespace-nowrap">
                  {confirmer && p.status === "PENDING" && <form action={confirmPayment} className="inline"><input type="hidden" name="paymentId" value={p.id} /><button className="btn btn-primary btn-sm">Confirm</button></form>}
                  {confirmer && p.status !== "REVERSED" && (
                    <details className="inline-block align-middle"><summary className="ml-2 cursor-pointer text-xs underline">Reverse</summary>
                      <form action={reversePayment} className="mt-1 flex gap-1"><input type="hidden" name="paymentId" value={p.id} /><input name="reason" placeholder="Reason" className="input !min-h-[30px] !py-1 text-xs" /><button className="btn btn-danger btn-sm">Reverse</button></form>
                    </details>
                  )}
                </td>
              </tr>
            ))}
            {inv.payments.length === 0 && <tr><td colSpan={7} className="text-slate">No payments yet.</td></tr>}
          </tbody>
        </table>
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Record a payment</h2>
          <form action={recordPayment} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="invoiceId" value={inv.id} />
            <label className="field-label">Amount<input name="amount" type="number" step="0.01" className="input mt-1" defaultValue={b.balance || ""} /></label>
            <label className="field-label">Method<select name="method" className="input mt-1"><option>CASH</option><option>BANK</option><option>ECOCASH</option><option>CARD</option><option>OTHER</option></select></label>
            <label className="field-label">Reference<input name="reference" className="input mt-1" placeholder="Bank / EcoCash ref" /></label>
            <label className="field-label">Date paid<input name="paidAt" type="date" className="input mt-1" /></label>
            <div className="sm:col-span-2"><SubmitButton variant="outline">Record as pending</SubmitButton></div>
          </form>
        </section>
        {confirmer && (
          <section className="panel p-5">
            <h2 className="font-display text-lg font-semibold">Approved concession</h2>
            <form action={applyConcession} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="invoiceId" value={inv.id} />
              <label className="field-label">Amount<input name="concession" type="number" step="0.01" className="input mt-1" defaultValue={inv.concession} /></label>
              <label className="field-label">Approval reference<input name="reason" className="input mt-1" placeholder="e.g. Principal memo 12/2026" /></label>
              <div className="sm:col-span-2"><SubmitButton variant="outline">Apply concession</SubmitButton></div>
            </form>
          </section>
        )}
      </div>
    </>
  );
}
