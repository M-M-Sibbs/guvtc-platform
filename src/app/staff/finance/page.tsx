import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { Stat, StatusBadge } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { createInvoice } from "@/app/actions/staff/finance";
import { invoiceBalance } from "@/lib/finance";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { invoiceStatusEnum } from "@/db/schema";

export const metadata = { title: "Fees & payments" };

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("finance.manage");
  const sp = await searchParams;
  const status = invoiceStatusEnum.enumValues.find((v) => v === sp.status);
  const [invoices, students, pendingPayments] = await Promise.all([
    db.query.invoices.findMany({ where: status ? eq(s.invoices.status, status) : undefined, with: { student: { with: { user: true } }, payments: true }, orderBy: desc(s.invoices.createdAt) }),
    db.query.students.findMany({ with: { user: true }, orderBy: asc(s.students.studentNumber) }),
    db.query.payments.findMany({ where: eq(s.payments.status, "PENDING"), with: { invoice: { with: { student: { with: { user: true } } } } }, orderBy: desc(s.payments.paidAt) }),
  ]);
  const totals = invoices.filter((i) => i.status !== "CANCELLED").reduce((t, i) => { const b = invoiceBalance(i); return { billed: t.billed + b.net, confirmed: t.confirmed + b.confirmed, pending: t.pending + b.pending, balance: t.balance + b.balance }; }, { billed: 0, confirmed: 0, pending: 0, balance: 0 });
  return (
    <>
      <PortalTitle title="Fees & payments" lead="Invoices, payments and receipts. Pending entries never reduce a balance until a finance officer confirms them. This module does not replace the government accounting system.">
        <a href="/staff/reports/export?type=fees" className="btn btn-outline">Export CSV</a>
      </PortalTitle>
      <Flash searchParams={searchParams} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Billed (net of concessions)" value={fmtMoney(totals.billed)} />
        <Stat label="Confirmed payments" value={fmtMoney(totals.confirmed)} />
        <Stat label="Pending confirmation" value={fmtMoney(totals.pending)} sub={`${pendingPayments.length} payments`} />
        <Stat label="Outstanding" value={fmtMoney(totals.balance)} />
      </div>
      {pendingPayments.length > 0 && (
        <section className="panel mt-6 overflow-hidden">
          <h2 className="px-5 py-4 font-display text-xl font-semibold">Payments awaiting confirmation</h2>
          <table className="table-std"><thead><tr><th>Date</th><th>Student</th><th>Invoice</th><th>Method & ref</th><th>Amount</th></tr></thead>
            <tbody>{pendingPayments.map((p) => <tr key={p.id}><td>{fmtDate(p.paidAt)}</td><td>{p.invoice.student.user.name}</td><td><Link className="underline" href={`/staff/finance/${p.invoiceId}`}>{p.invoice.number}</Link></td><td>{p.method} {p.reference}</td><td>{fmtMoney(p.amount)}</td></tr>)}</tbody>
          </table>
        </section>
      )}
      <nav className="mt-6 mb-3 flex flex-wrap gap-2 text-sm">
        <Link href="/staff/finance" className={`rounded-sm border px-3 py-1 ${!status ? "border-navy bg-navy text-white" : "border-line bg-white"}`}>All</Link>
        {invoiceStatusEnum.enumValues.map((v) => <Link key={v} href={`?status=${v}`} className={`rounded-sm border px-3 py-1 ${status === v ? "border-navy bg-navy text-white" : "border-line bg-white"}`}>{v.replace("_", " ").toLowerCase()}</Link>)}
      </nav>
      <div className="panel overflow-x-auto">
        <table className="table-std">
          <thead><tr><th>Invoice</th><th>Student</th><th>Due</th><th className="text-right">Amount</th><th className="text-right">Balance</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <td><Link href={`/staff/finance/${i.id}`} className="font-semibold hover:underline">{i.number}</Link><span className="block text-xs text-slate">{i.description}</span></td>
                <td>{i.student.user.name}<span className="block text-xs text-slate">{i.student.studentNumber}</span></td>
                <td>{fmtDate(i.dueDate)}</td>
                <td className="text-right tabular-nums">{fmtMoney(i.amount, i.currency)}</td>
                <td className="text-right tabular-nums">{fmtMoney(invoiceBalance(i).balance, i.currency)}</td>
                <td><StatusBadge status={i.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="panel mt-6 p-5">
        <h2 className="font-display text-xl font-semibold">New invoice</h2>
        <form action={createInvoice} className="mt-3 grid gap-3 md:grid-cols-5 md:items-end">
          <div className="md:col-span-2"><label className="field-label">Student</label><select name="studentId" className="input"><option value="">Choose…</option>{students.map((st) => <option key={st.id} value={st.id}>{st.studentNumber} — {st.user.name}</option>)}</select></div>
          <div className="md:col-span-2"><label className="field-label">Description</label><input name="description" className="input" placeholder="e.g. Cake Making — tuition" /></div>
          <div><label className="field-label">Amount (USD)</label><input name="amount" type="number" step="0.01" className="input" /></div>
          <div><label className="field-label">Due date</label><input name="dueDate" type="date" className="input" /></div>
          <div><SubmitButton>Create invoice</SubmitButton></div>
        </form>
      </section>
    </>
  );
}
