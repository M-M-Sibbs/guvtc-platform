import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "@/components/student/print-button";
import { fmtDate, fmtMoney } from "@/lib/utils";

export default async function Receipt({ params }: { params: Promise<{ paymentId: string }> }) {
  await requireStaff("finance.manage");
  const { paymentId } = await params;
  const p = await db.query.payments.findFirst({ where: eq(s.payments.id, paymentId), with: { invoice: { with: { student: { with: { user: true } } } } } });
  if (!p || p.status !== "CONFIRMED") notFound();
  const st = await getSettings();
  return (
    <div className="mx-auto max-w-xl bg-white p-8">
      <div className="mb-6 flex justify-end"><PrintButton /></div>
      <p className="font-display text-2xl font-semibold">{st.institution_name}</p>
      <p className="text-sm text-slate">{st.address} · {st.contact_phone}</p>
      <h1 className="mt-6 border-y-2 border-navy py-2 text-center text-xl font-semibold">Official receipt {p.receiptNumber}</h1>
      <dl className="mt-6 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-slate">Received from</dt><dd className="font-semibold">{p.invoice.student.user.name} ({p.invoice.student.studentNumber})</dd>
        <dt className="text-slate">For</dt><dd>{p.invoice.description} — {p.invoice.number}</dd>
        <dt className="text-slate">Amount</dt><dd className="font-display text-xl font-semibold">{fmtMoney(p.amount, p.invoice.currency)}</dd>
        <dt className="text-slate">Method</dt><dd>{p.method} {p.reference}</dd>
        <dt className="text-slate">Date paid</dt><dd>{fmtDate(p.paidAt)}</dd>
      </dl>
      <p className="mt-10 border-t border-line pt-3 text-xs text-slate">Issued electronically after confirmation by the finance office.</p>
    </div>
  );
}
