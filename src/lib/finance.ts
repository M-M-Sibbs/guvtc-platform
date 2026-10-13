// Balances count CONFIRMED payments only — pending or reversed entries never reduce what is owed.
export function invoiceBalance(inv: { amount: string; concession: string; payments: { amount: string; status: string }[] }) {
  const net = Number(inv.amount) - Number(inv.concession);
  const confirmed = inv.payments.filter((p) => p.status === "CONFIRMED").reduce((t, p) => t + Number(p.amount), 0);
  const pending = inv.payments.filter((p) => p.status === "PENDING").reduce((t, p) => t + Number(p.amount), 0);
  return { net, confirmed, pending, balance: Math.max(0, Math.round((net - confirmed) * 100) / 100) };
}

export function statusFor(net: number, confirmed: number) {
  if (confirmed <= 0) return "UNPAID" as const;
  if (confirmed + 0.005 >= net) return "PAID" as const;
  return "PART_PAID" as const;
}
