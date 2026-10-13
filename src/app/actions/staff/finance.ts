"use server";
import { and, desc, eq, like } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { back, fail, optStr, str, optDate } from "@/lib/action-helpers";
import { invoiceBalance, statusFor } from "@/lib/finance";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function nextNumber(tx: Tx, prefix: "INV" | "RC", table: "invoices" | "payments") {
  const year = new Date().getFullYear();
  const base = `${prefix}-${year}-`;
  const col = table === "invoices" ? s.invoices.number : s.payments.receiptNumber;
  const [last] = await tx.select({ n: col }).from(table === "invoices" ? s.invoices : s.payments).where(like(col, `${base}%`)).orderBy(desc(col)).limit(1);
  const seq = last?.n ? Number(last.n.slice(base.length)) + 1 : 1;
  return `${base}${String(seq).padStart(4, "0")}`;
}

async function refreshStatus(tx: Tx, invoiceId: string) {
  const inv = await tx.query.invoices.findFirst({ where: eq(s.invoices.id, invoiceId), with: { payments: true } });
  if (!inv || inv.status === "CANCELLED") return;
  const b = invoiceBalance(inv);
  await tx.update(s.invoices).set({ status: statusFor(b.net, b.confirmed) }).where(eq(s.invoices.id, invoiceId));
}

export async function createInvoice(fd: FormData) {
  const me = await assertCan("finance.manage");
  const amount = Number(str(fd, "amount"));
  if (!str(fd, "studentId") || !str(fd, "description") || !(amount > 0)) fail("/staff/finance", "Student, description and a positive amount are required.");
  const inv = await db.transaction(async (tx) => {
    const [row] = await tx.insert(s.invoices).values({
      number: await nextNumber(tx, "INV", "invoices"), studentId: str(fd, "studentId"), description: str(fd, "description"),
      amount: amount.toFixed(2), currency: str(fd, "currency") || "USD", dueDate: optDate(fd, "dueDate"),
    }).returning();
    return row;
  });
  await audit(me, "invoice.create", "invoice", inv.id, { number: inv.number, amount });
  back(`/staff/finance/${inv.id}`, `Invoice ${inv.number} created.`);
}

/** Records a payment as PENDING. It reduces the balance only after a finance officer confirms it. */
export async function recordPayment(fd: FormData) {
  const me = await assertCan("finance.manage");
  const invoiceId = str(fd, "invoiceId");
  const ret = `/staff/finance/${invoiceId}`;
  const amount = Number(str(fd, "amount"));
  if (!(amount > 0)) fail(ret, "Enter a positive amount.");
  const method = str(fd, "method");
  if (!["CASH", "BANK", "ECOCASH", "CARD", "OTHER"].includes(method)) fail(ret, "Choose a payment method.");
  const [p] = await db.insert(s.payments).values({ invoiceId, amount: amount.toFixed(2), method, reference: optStr(fd, "reference"), paidAt: optDate(fd, "paidAt") ?? new Date(), recordedById: me.id, status: "PENDING", manualEntry: true }).returning();
  await audit(me, "payment.record", "invoice", invoiceId, { paymentId: p.id, amount, method });
  back(ret, "Payment recorded as pending. Confirm it once verified against the cash book or bank statement.");
}

export async function confirmPayment(fd: FormData) {
  const me = await assertCan("finance.confirm");
  const id = str(fd, "paymentId");
  const p = await db.query.payments.findFirst({ where: eq(s.payments.id, id) });
  if (!p) fail("/staff/finance", "Payment not found");
  const ret = `/staff/finance/${p!.invoiceId}`;
  if (p!.status !== "PENDING") fail(ret, "Only pending payments can be confirmed.");
  const receipt = await db.transaction(async (tx) => {
    const number = await nextNumber(tx, "RC", "payments");
    await tx.update(s.payments).set({ status: "CONFIRMED", confirmedById: me.id, receiptNumber: number }).where(and(eq(s.payments.id, id), eq(s.payments.status, "PENDING")));
    await refreshStatus(tx, p!.invoiceId);
    return number;
  });
  await audit(me, "payment.confirm", "invoice", p!.invoiceId, { paymentId: id, receipt });
  back(ret, `Confirmed. Receipt ${receipt} issued.`);
}

export async function reversePayment(fd: FormData) {
  const me = await assertCan("finance.confirm");
  const id = str(fd, "paymentId");
  const reason = optStr(fd, "reason");
  const p = await db.query.payments.findFirst({ where: eq(s.payments.id, id) });
  if (!p) fail("/staff/finance", "Payment not found");
  if (!reason) fail(`/staff/finance/${p!.invoiceId}`, "A reason is required to reverse a payment.");
  await db.transaction(async (tx) => {
    await tx.update(s.payments).set({ status: "REVERSED" }).where(eq(s.payments.id, id));
    await refreshStatus(tx, p!.invoiceId);
  });
  await audit(me, "payment.reverse", "invoice", p!.invoiceId, { paymentId: id, reason, previous: p!.status });
  back(`/staff/finance/${p!.invoiceId}`, "Payment reversed.");
}

export async function applyConcession(fd: FormData) {
  const me = await assertCan("finance.confirm");
  const id = str(fd, "invoiceId");
  const amount = Number(str(fd, "concession"));
  const reason = optStr(fd, "reason");
  if (!(amount >= 0) || !reason) fail(`/staff/finance/${id}`, "Enter the concession amount and the approval reference.");
  await db.transaction(async (tx) => {
    await tx.update(s.invoices).set({ concession: amount.toFixed(2) }).where(eq(s.invoices.id, id));
    await refreshStatus(tx, id);
  });
  await audit(me, "invoice.concession", "invoice", id, { amount, reason });
  back(`/staff/finance/${id}`, "Concession applied.");
}
