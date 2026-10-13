import Link from "next/link";
import type { ReactNode } from "react";
import { cn, titleCase } from "@/lib/utils";

export function PageHeader({ title, lead, children, crumbs }: { title: string; lead?: string; children?: ReactNode; crumbs?: { href: string; label: string }[] }) {
  return (
    <header className="bg-navy text-white">
      <div className="container-page py-12 md:py-16">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-light">
            {crumbs.map((c, i) => (
              <span key={c.href}>
                <Link href={c.href} className="hover:text-white underline-offset-4 hover:underline">{c.label}</Link>
                {i < crumbs.length - 1 && <span className="mx-2" aria-hidden>/</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-4xl md:text-5xl font-semibold max-w-3xl leading-tight">{title}</h1>
        <div className="rule-gold mt-5" />
        {lead && <p className="mt-5 text-lg text-mist/90 max-w-2xl">{lead}</p>}
        {children}
      </div>
    </header>
  );
}

const TONES = {
  neutral: "bg-mist text-navy-700",
  navy: "bg-navy text-white",
  gold: "bg-gold-light text-gold-ink",
  success: "bg-success-bg text-success",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold", TONES[tone], className)}>{children}</span>;
}

const STATUS_TONE: Record<string, Tone> = {
  SUBMITTED: "navy", UNDER_REVIEW: "gold", CORRECTIONS_REQUESTED: "warn", ACCEPTED: "success", ENROLLED: "success",
  WAITLISTED: "gold", REJECTED: "danger", WITHDRAWN: "neutral",
  DRAFT: "neutral", PENDING_APPROVAL: "gold", PUBLISHED: "success", ARCHIVED: "neutral", SCHEDULED: "navy", EXPIRED: "neutral", LIVE: "success",
  OPEN: "success", CLOSED: "neutral", ACTIVE: "success", COMPLETED: "navy", SUSPENDED: "warn",
  UNPAID: "danger", PART_PAID: "warn", PAID: "success", CANCELLED: "neutral",
  PENDING: "gold", CONFIRMED: "success", REVERSED: "danger", SENT: "success", FAILED: "danger",
  PRESENT: "success", ABSENT: "danger", LATE: "warn", EXCUSED: "neutral",
  NEW: "navy", RESPONDED: "success",
};
const STATUS_LABEL: Record<string, string> = {
  CORRECTIONS_REQUESTED: "More information needed", PENDING_APPROVAL: "Awaiting approval", PART_PAID: "Part paid", UNDER_REVIEW: "Under review",
};
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{STATUS_LABEL[status] ?? titleCase(status)}</Badge>;
}

export function Field({ label, name, hint, error, required, children }: { label: string; name: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label} {required ? <span className="text-danger" aria-hidden>*</span> : <span className="font-normal text-slate">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="field-hint" id={`${name}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${name}-error`} role="alert">{error}</p>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-mist-2 px-6 py-10 text-center">
      <p className="font-display text-xl">{title}</p>
      {body && <p className="mt-2 text-sm text-slate max-w-md mx-auto">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const border: Record<Tone, string> = { neutral: "border-line", navy: "border-navy", gold: "border-gold", success: "border-success", warn: "border-warn", danger: "border-danger" };
  return <div role="status" className={cn("rounded-md border-l-4 px-4 py-3 text-sm", border[tone], TONES[tone === "navy" ? "neutral" : tone])}>{children}</div>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="panel p-5">
      <p className="text-sm text-slate">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate">{sub}</p>}
    </div>
  );
}
