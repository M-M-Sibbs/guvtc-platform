export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** tel: link for a Zimbabwean number written locally (054 2221705) or internationally (+263 …). */
export function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits.startsWith("0") ? `+263${digits.slice(1)}` : digits}`;
}

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 80);
}

const TZ = "Africa/Harare";
export function fmtDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-ZW", { timeZone: TZ, ...opts }).format(new Date(d));
}
export function fmtDateTime(d: Date | string | null | undefined) {
  return fmtDate(d, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function fmtMoney(v: string | number | null | undefined, currency = "USD") {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}
export function daysUntil(d: Date | string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
export function titleCase(s: string) {
  return s.toLowerCase().replace(/_/g, " ").replace(/(^|\s)\S/g, (t) => t.toUpperCase());
}
export const DELIVERY_LABELS: Record<string, string> = {
  IN_PERSON: "In person",
  ONLINE_LIVE: "Online (live)",
  RECORDED: "Recorded",
  BLENDED: "Blended",
};

/** Value for <input type="datetime-local"> in Harare time. */
export function toLocalInput(d: Date | string | null | undefined, dateOnly = false) {
  if (!d) return "";
  const x = new Date(new Date(d).getTime() + 2 * 3600000).toISOString();
  return dateOnly ? x.slice(0, 10) : x.slice(0, 16);
}
