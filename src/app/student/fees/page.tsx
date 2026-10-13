import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStudent } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { StatusBadge, Notice } from "@/components/ui/ui";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { invoiceBalance } from "@/lib/finance";

export const metadata = { title: "Fees" };

export default async function FeesPage() {
  const me = await requireStudent();
  const invoices = await db.query.invoices.findMany({ where: eq(s.invoices.studentId, me.studentId), with: { payments: { orderBy: desc(s.payments.paidAt) } }, orderBy: desc(s.invoices.createdAt) });
  const outstanding = invoices.filter((i) => i.status !== "CANCELLED").reduce((t, i) => t + invoiceBalance(i).balance, 0);
  return (
    <>
      <PortalTitle title="Fees" lead="Your invoices, payments and balance." />
      <div className="panel mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div><p className="text-sm text-slate">Outstanding balance (confirmed payments only)</p><p className="font-display text-4xl font-semibold">{fmtMoney(outstanding)}</p></div>
        <p className="max-w-sm text-sm text-slate">Payments marked “pending” are being checked by the finance office and are not yet deducted.</p>
      </div>
      <div className="space-y-5">
        {invoices.map((inv) => {
          const b = invoiceBalance(inv);
          return (
            <section key={inv.id} className="panel overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div><p className="font-semibold">{inv.description}</p><p className="text-sm text-slate">{inv.number} · due {fmtDate(inv.dueDate)}</p></div>
                <div className="text-right"><StatusBadge status={inv.status} /><p className="mt-1 text-sm">Balance <strong>{fmtMoney(b.balance, inv.currency)}</strong> of {fmtMoney(b.net, inv.currency)}</p></div>
              </header>
              <table className="table-std">
                <thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead>
                <tbody>
                  {inv.payments.map((p) => (
                    <tr key={p.id}><td>{fmtDate(p.paidAt)}</td><td>{p.method}</td><td>{fmtMoney(p.amount, inv.currency)}</td><td><StatusBadge status={p.status} /></td><td>{p.receiptNumber ?? "—"}</td></tr>
                  ))}
                  {inv.payments.length === 0 && <tr><td colSpan={5} className="text-slate">No payments recorded.</td></tr>}
                </tbody>
              </table>
            </section>
          );
        })}
        {invoices.length === 0 && <Notice>No invoices have been issued to you.</Notice>}
      </div>
    </>
  );
}
